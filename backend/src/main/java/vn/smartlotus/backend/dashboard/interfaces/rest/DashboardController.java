package vn.smartlotus.backend.dashboard.interfaces.rest;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import vn.smartlotus.backend.identity.application.UserApplicationService;
import vn.smartlotus.backend.identity.domain.UserEntity;

/**
 * Dữ liệu bảng điều khiển của học sinh (tương đương route Next /api/dashboard).
 * Backend giờ là nguồn dữ liệu duy nhất; các chỉ số được tính bằng SQL trên cùng
 * các bảng quiz_attempts / daily_activity / lessons.
 */
@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    private final UserApplicationService users;
    private final JdbcTemplate jdbc;
    private final ObjectMapper objectMapper;

    public DashboardController(UserApplicationService users, JdbcTemplate jdbc, ObjectMapper objectMapper) {
        this.users = users;
        this.jdbc = jdbc;
        this.objectMapper = objectMapper;
    }

    @GetMapping
    public DashboardResponse getDashboard(@RequestParam(defaultValue = "student") String role) {
        UserEntity user = users.requireCurrentUser();
        long userId = user.getId();

        String today = LocalDate.now(ZoneOffset.UTC).toString();
        Instant todayStart = LocalDate.now(ZoneOffset.UTC).atStartOfDay().toInstant(ZoneOffset.UTC);
        String weekStart = LocalDate.now(ZoneOffset.UTC).minusDays(6).toString();

        // Lịch sử & gần đây: 20 lượt làm bài mới nhất.
        List<AttemptRow> attempts = jdbc.query(
                "SELECT id, lesson_slug, score, correct_answers, total_questions, duration_seconds, completed_at "
                        + "FROM quiz_attempts WHERE user_id = ? ORDER BY completed_at DESC LIMIT 20",
                (rs, row) -> new AttemptRow(
                        rs.getLong("id"),
                        rs.getString("lesson_slug"),
                        rs.getInt("score"),
                        rs.getInt("correct_answers"),
                        rs.getInt("total_questions"),
                        rs.getInt("duration_seconds"),
                        rs.getTimestamp("completed_at").toInstant().toString()
                ),
                userId
        );

        List<Map<String, Object>> attemptHistory = new ArrayList<>();
        List<Map<String, Object>> recentAttempts = new ArrayList<>();
        for (int i = 0; i < attempts.size(); i++) {
            AttemptRow a = attempts.get(i);
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("lessonSlug", a.lessonSlug);
            entry.put("correctAnswers", a.correctAnswers);
            entry.put("totalQuestions", a.totalQuestions);
            entry.put("score", a.score);
            entry.put("durationSeconds", a.durationSeconds);
            entry.put("completedAt", a.completedAt);
            attemptHistory.add(entry);
            if (i < 8) {
                Map<String, Object> recent = new LinkedHashMap<>(entry);
                recent.put("id", a.id);
                recentAttempts.add(recent);
            }
        }

        // Hoạt động hôm nay.
        Map<String, Object> todayActivity = jdbc.query(
                "SELECT minutes_learned, lessons_completed, points_earned FROM daily_activity "
                        + "WHERE user_id = ? AND activity_date = ? LIMIT 1",
                rs -> {
                    if (!rs.next()) {
                        return Map.of("minutesLearned", 0, "lessonsCompleted", 0, "pointsEarned", 0);
                    }
                    return Map.of(
                            "minutesLearned", rs.getInt("minutes_learned"),
                            "lessonsCompleted", rs.getInt("lessons_completed"),
                            "pointsEarned", rs.getInt("points_earned")
                    );
                },
                userId, today
        );
        Map<String, Object> todayStats = jdbc.query(
                "SELECT coalesce(sum(correct_answers), 0)::int AS correct, count(*) AS attempts, "
                        + "coalesce(sum(round(correct_answers * 100.0 / nullif(total_questions, 0))), 0)::int AS accuracy "
                        + "FROM quiz_attempts WHERE user_id = ? AND completed_at >= ?",
                rs -> {
                    rs.next();
                    return Map.of(
                            "correctAnswers", rs.getInt("correct"),
                            "attempts", rs.getInt("attempts"),
                            "accuracySum", rs.getInt("accuracy")
                    );
                },
                userId, Timestamp.from(todayStart)
        );

        // Bảng xếp hạng tuần (theo điểm tích lũy 7 ngày gần nhất).
        List<LeaderboardEntry> weeklyLeaderboard = jdbc.query(
                "SELECT da.user_id AS uid, u.display_name AS name, u.avatar AS avatar, "
                        + "sum(da.points_earned)::int AS points FROM daily_activity da "
                        + "JOIN users u ON u.id = da.user_id WHERE da.activity_date >= ? "
                        + "GROUP BY da.user_id, u.display_name, u.avatar ORDER BY points DESC LIMIT 10",
                (rs, row) -> new LeaderboardEntry(
                        rs.getString("name"),
                        rs.getString("avatar"),
                        rs.getInt("points"),
                        rs.getLong("uid") == userId
                ),
                weekStart
        );

        // Thống kê bài học (tổng + đã hoàn thành theo slug) và điểm trung bình.
        int totalLessons = jdbc.queryForObject("SELECT count(*) FROM lessons WHERE published = true", Integer.class);
        Integer completedLessons = jdbc.queryForObject(
                "SELECT count(DISTINCT qa.lesson_slug) FROM lessons l "
                        + "LEFT JOIN quiz_attempts qa ON qa.user_id = ? AND (qa.lesson_id = l.id OR qa.lesson_slug = l.slug) "
                        + "WHERE l.published = true AND qa.lesson_slug IS NOT NULL",
                Integer.class, userId);
        Integer averageScore = jdbc.queryForObject(
                "SELECT coalesce(round(avg(correct_answers * 100.0 / nullif(total_questions, 0))), 0)::int "
                        + "FROM quiz_attempts WHERE user_id = ?",
                Integer.class, userId);
        Integer learningMinutes = jdbc.queryForObject(
                "SELECT coalesce(sum(minutes_learned), 0)::int FROM daily_activity WHERE user_id = ?",
                Integer.class, userId);
        Integer lowScoreAttempts = jdbc.queryForObject(
                "SELECT count(*) FROM quiz_attempts WHERE user_id = ? AND score < 50",
                Integer.class, userId);

        JsonNode placement = null;
        if (user.getPlacement() != null) {
            try {
                placement = objectMapper.readTree(user.getPlacement());
            } catch (Exception ignored) {
                placement = null;
            }
        }

        return new DashboardResponse(
                new UserResponse(user.getId(), user.getDisplayName(), user.getEmail(), user.getRole().name(),
                        user.getAvatar(), user.getAvatarUrl(), user.getLotusPoints(), user.getCurrentStreak()),
                new StatsResponse(completedLessons == null ? 0 : completedLessons, totalLessons,
                        averageScore == null ? 0 : averageScore, learningMinutes == null ? 0 : learningMinutes),
                recentAttempts,
                new ActivityResponse(
                        (int) todayActivity.get("minutesLearned"),
                        (int) todayActivity.get("lessonsCompleted"),
                        (int) todayActivity.get("pointsEarned"),
                        (int) todayStats.get("correctAnswers"),
                        (int) todayStats.get("attempts"),
                        (int) todayStats.get("accuracySum")
                ),
                weeklyLeaderboard,
                lowScoreAttempts == null ? 0 : lowScoreAttempts,
                attemptHistory,
                placement
        );
    }

    private record AttemptRow(long id, String lessonSlug, int score, int correctAnswers,
                               int totalQuestions, int durationSeconds, String completedAt) {
    }

    public record DashboardResponse(
            UserResponse user,
            StatsResponse stats,
            List<Map<String, Object>> recentAttempts,
            ActivityResponse todayActivity,
            List<LeaderboardEntry> weeklyLeaderboard,
            int lowScoreAttempts,
            List<Map<String, Object>> attemptHistory,
            JsonNode placement
    ) {
    }

    public record UserResponse(long id, String displayName, String email, String role, String avatar,
                                String avatarUrl, int lotusPoints, int currentStreak) {
    }

    public record StatsResponse(int completedLessons, int totalLessons, int averageScore, int learningMinutes) {
    }

    public record ActivityResponse(int minutesLearned, int lessonsCompleted, int pointsEarned,
                                    int correctAnswers, int attempts, int accuracySum) {
    }

    public record LeaderboardEntry(String name, String avatar, int points, boolean isCurrentUser) {
    }
}
