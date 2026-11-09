package vn.smartlotus.backend.admin.interfaces.rest;

import java.util.List;
import java.util.Map;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import vn.smartlotus.backend.identity.application.UserApplicationService;
import vn.smartlotus.backend.identity.domain.UserRole;
import vn.smartlotus.backend.shared.api.ForbiddenOperationException;

@RestController
@RequestMapping("/api/admin")
public class AdminController {
    private final UserApplicationService users;
    private final JdbcTemplate jdbc;

    public AdminController(UserApplicationService users, JdbcTemplate jdbc) {
        this.users = users;
        this.jdbc = jdbc;
    }

    @GetMapping("/overview")
    public AdminOverview overview() {
        if (users.requireCurrentUser().getRole() != UserRole.admin) {
            throw new ForbiddenOperationException("Chỉ quản trị viên mới được xem tổng quan hệ thống");
        }

        Map<String, Integer> metrics = jdbc.queryForObject(
            "SELECT "
                + "(SELECT count(*)::int FROM users) AS total_users, "
                + "(SELECT count(*)::int FROM users WHERE role = 'student' AND last_active_at >= now() - interval '7 days') AS active_students, "
                + "(SELECT count(*)::int FROM quiz_attempts WHERE completed_at >= date_trunc('day', now())) AS attempts_today, "
                + "COALESCE((SELECT round(100.0 * count(DISTINCT qa.user_id) / NULLIF(count(DISTINCT u.id), 0))::int "
                    + "FROM users u LEFT JOIN quiz_attempts qa ON qa.user_id = u.id AND qa.completed_at >= now() - interval '30 days' "
                    + "WHERE u.role = 'student'), 0) AS completion_rate",
            (rs, row) -> Map.of(
                "totalUsers", rs.getInt("total_users"),
                "activeStudents", rs.getInt("active_students"),
                "attemptsToday", rs.getInt("attempts_today"),
                "completionRate", rs.getInt("completion_rate")
            )
        );

        List<ActivityPoint> activity = jdbc.query(
            "SELECT to_char(days.day, 'YYYY-MM-DD') AS day, count(qa.id)::int AS attempts "
                + "FROM generate_series(current_date - interval '6 days', current_date, interval '1 day') AS days(day) "
                + "LEFT JOIN quiz_attempts qa ON qa.completed_at >= days.day "
                + "AND qa.completed_at < days.day + interval '1 day' "
                + "GROUP BY days.day ORDER BY days.day",
            (rs, row) -> new ActivityPoint(rs.getString("day"), rs.getInt("attempts"))
        );

        return new AdminOverview(
            metrics.get("totalUsers"), metrics.get("activeStudents"), metrics.get("attemptsToday"),
            metrics.get("completionRate"), activity
        );
    }

    public record AdminOverview(int totalUsers, int activeStudents, int attemptsToday,
                                int completionRate, List<ActivityPoint> activity) {}

    public record ActivityPoint(String day, int attempts) {}
}
