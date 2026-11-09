package vn.smartlotus.backend.shared.api;

import java.util.List;
import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import vn.smartlotus.backend.identity.application.UserApplicationService;
import vn.smartlotus.backend.identity.domain.UserEntity;

@RestController
@RequestMapping("/api")
public class FrontendCompatibilityController {
    private final JdbcTemplate jdbc;
    private final UserApplicationService users;
    private final ObjectMapper json;

    public FrontendCompatibilityController(JdbcTemplate jdbc, UserApplicationService users, ObjectMapper json) {
        this.jdbc = jdbc;
        this.users = users;
        this.json = json;
    }

    @GetMapping("/student-code")
    public Map<String, String> studentCode() {
        UserEntity user = users.requireCurrentUser();
        return Map.of("studentCode", "SL-STU-" + String.format("%06d", user.getId()));
    }

    @GetMapping("/classrooms/{id}")
    public Map<String, Object> classroom(@PathVariable long id) {
        UserEntity current = users.requireCurrentUser();
        Map<String, Object> classroom = jdbc.<Map<String, Object>>query(
            "SELECT c.id, c.name, c.label, c.subject, c.description, c.color, c.join_code, u.display_name teacher_name "
                + "FROM classrooms c JOIN users u ON u.id = c.teacher_id "
                + "WHERE c.id = ? AND (c.teacher_id = ? OR EXISTS "
                + "(SELECT 1 FROM classroom_memberships cm WHERE cm.classroom_id = c.id AND cm.student_id = ?))",
            (rs, row) -> Map.of("id", String.valueOf(rs.getLong("id")), "name", rs.getString("name"),
                "label", rs.getString("label"), "subject", rs.getString("subject"), "description", rs.getString("description"),
                "color", rs.getString("color"), "joinCode", rs.getString("join_code"), "teacherName", rs.getString("teacher_name")),
            id, current.getId(), current.getId()).stream().findFirst()
            .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy lớp học hoặc bạn không có quyền truy cập"));
        List<Map<String, Object>> students = jdbc.query(
            "SELECT u.id, u.display_name full_name, u.email, COALESCE(sp.class_name, '') class_name, u.lotus_points score "
                + "FROM classroom_memberships cm JOIN users u ON u.id = cm.student_id "
                + "LEFT JOIN student_profiles sp ON sp.user_id = u.id WHERE cm.classroom_id = ? ORDER BY u.display_name",
            (rs, row) -> {
                Map<String, Object> student = new LinkedHashMap<>();
                student.put("id", String.valueOf(rs.getLong("id")));
                student.put("fullName", rs.getString("full_name"));
                student.put("email", rs.getString("email"));
                student.put("birthDate", "");
                student.put("gender", "Chưa cập nhật");
                student.put("className", rs.getString("class_name"));
                student.put("parentName", "");
                student.put("parentPhone", "");
                student.put("score", rs.getInt("score"));
                student.put("lessonsCompleted", 0);
                student.put("totalLessons", 0);
                student.put("lastActive", "");
                student.put("status", "Đang tiến bộ");
                return student;
            }, id);
        return Map.of("classroom", classroom, "students", students);
    }

    @PostMapping("/classrooms/join")
    public Map<String, Object> join(@RequestBody Map<String, String> body) {
        if (body == null) throw new IllegalArgumentException("Mã lớp là bắt buộc");
        UserEntity student = users.requireCurrentUser();
        if (!"student".equals(student.getRole().name())) throw new IllegalArgumentException("Chỉ học sinh mới có thể tham gia lớp");
        String code = body.getOrDefault("code", "").trim().toUpperCase();
        Map<String, Object> classroom = jdbc.queryForObject(
            "SELECT id, name, label, subject, description, color, join_code, teacher_id FROM classrooms WHERE join_code = ?",
            (rs, row) -> Map.of("id", rs.getLong("id"), "name", rs.getString("name"), "label", rs.getString("label"),
                "subject", rs.getString("subject"), "description", rs.getString("description"), "color", rs.getString("color"),
                "joinCode", rs.getString("join_code"), "teacherId", rs.getLong("teacher_id")), code);
        jdbc.update("INSERT INTO classroom_memberships(classroom_id, student_id) VALUES (?, ?) ON CONFLICT DO NOTHING",
            classroom.get("id"), student.getId());
        classroom.put("id", String.valueOf(classroom.get("id")));
        classroom.remove("teacherId");
        return Map.of("classroom", classroom);
    }

    @PostMapping("/classrooms/{id}/invite")
    public Map<String, Object> invite(@PathVariable long id, @RequestBody Map<String, String> body) {
        if (body == null) throw new IllegalArgumentException("Mã học sinh là bắt buộc");
        UserEntity teacher = users.requireCurrentUser();
        if ("student".equals(teacher.getRole().name())) throw new IllegalArgumentException("Chỉ giáo viên mới được mời học sinh");
        String code = body.getOrDefault("studentCode", "").trim().toUpperCase();
        String digits = code.replaceAll("[^0-9]", "");
        if (digits.isBlank()) throw new IllegalArgumentException("Mã học sinh không hợp lệ");
        long studentId = Long.parseLong(digits);
        Integer owned = jdbc.queryForObject("SELECT count(*) FROM classrooms WHERE id = ? AND teacher_id = ?", Integer.class, id, teacher.getId());
        if (owned == null || owned == 0) throw new IllegalArgumentException("Không tìm thấy lớp học của bạn");
        Integer isStudent = jdbc.queryForObject("SELECT count(*) FROM users WHERE id = ? AND role = 'student'", Integer.class, studentId);
        if (isStudent == null || isStudent == 0) throw new IllegalArgumentException("Mã học sinh không hợp lệ");
        jdbc.update("INSERT INTO classroom_invitations(classroom_id, student_id, status) VALUES (?, ?, 'pending') "
            + "ON CONFLICT (classroom_id, student_id) DO UPDATE SET status = 'pending', created_at = now(), responded_at = NULL", id, studentId);
        Long invitationId = jdbc.queryForObject("SELECT id FROM classroom_invitations WHERE classroom_id = ? AND student_id = ?", Long.class, id, studentId);
        return Map.of("invitation", Map.of("id", String.valueOf(invitationId), "status", "pending"));
    }

    @PostMapping("/assignments/{id}/submit")
    public Map<String, Object> submitAssignment(@PathVariable long id, @RequestBody Map<String, Object> body) throws Exception {
        if (body == null) throw new IllegalArgumentException("Dữ liệu bài nộp là bắt buộc");
        UserEntity student = users.requireCurrentUser();
        if (!"student".equals(student.getRole().name())) throw new IllegalArgumentException("Chỉ học sinh mới được nộp bài");
        Integer allowed = jdbc.queryForObject("SELECT count(*) FROM classroom_assignments a JOIN classroom_memberships m "
            + "ON m.classroom_id = a.classroom_id WHERE a.id = ? AND m.student_id = ?", Integer.class, id, student.getId());
        if (allowed == null || allowed == 0) throw new IllegalArgumentException("Bài tập chưa được giao cho học sinh này");
        JsonNode questions = json.readTree(jdbc.queryForObject("SELECT questions::text FROM classroom_assignments WHERE id = ?", String.class, id));
        JsonNode submitted = json.valueToTree(body.get("answers"));
        int correct = 0;
        for (JsonNode question : questions) {
            boolean matched = false;
            for (JsonNode answer : submitted) {
                JsonNode submittedQuestionId = answer.has("questionId") ? answer.get("questionId") : answer.get("id");
                JsonNode submittedValue = answer.has("answer") ? answer.get("answer") : answer.get("choice");
                JsonNode expectedValue = question.has("correctAnswer")
                    ? question.get("correctAnswer")
                    : question.has("correct_answer") ? question.get("correct_answer") : question.get("answer");
                if (submittedQuestionId != null && submittedValue != null && expectedValue != null
                    && submittedQuestionId.asInt() == question.path("id").asInt()
                    && submittedValue.asText().trim().equalsIgnoreCase(expectedValue.asText().trim())) {
                    matched = true;
                    break;
                }
            }
            if (matched) correct++;
        }
        int total = questions.size();
        int score = total == 0 ? 0 : Math.round(correct * 100f / total);
        Object rawDuration = body.getOrDefault("durationSeconds", 1);
        int duration = rawDuration instanceof Number number ? Math.max(1, number.intValue()) : 1;
        jdbc.update("INSERT INTO assignment_submissions(assignment_id, student_id, score, correct_answers, total_questions, duration_seconds, answers) "
            + "VALUES (?, ?, ?, ?, ?, ?, ?::jsonb) ON CONFLICT (assignment_id, student_id) DO UPDATE SET score = EXCLUDED.score, "
            + "correct_answers = EXCLUDED.correct_answers, total_questions = EXCLUDED.total_questions, duration_seconds = EXCLUDED.duration_seconds, "
            + "answers = EXCLUDED.answers, submitted_at = now()", id, student.getId(), score, correct, total, duration, submitted.toString());
        return Map.of("submission", Map.of("score", score, "correctAnswers", correct, "totalQuestions", total));
    }
}
