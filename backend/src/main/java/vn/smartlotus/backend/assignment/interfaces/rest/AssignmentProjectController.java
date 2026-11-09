package vn.smartlotus.backend.assignment.interfaces.rest;

import java.util.List;
import java.util.Map;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import vn.smartlotus.backend.identity.application.UserApplicationService;
import vn.smartlotus.backend.identity.domain.UserEntity;
import vn.smartlotus.backend.identity.domain.UserRole;

/**
 * Bộ dự án bài tập do giáo viên quản lý (bảng assignment_projects).
 * Tương đương route Next /api/assignment-projects, giờ backend làm nguồn dữ liệu.
 */
@RestController
@RequestMapping("/api/assignment-projects")
public class AssignmentProjectController {

    private final JdbcTemplate jdbc;
    private final UserApplicationService users;
    private final ObjectMapper objectMapper;

    public AssignmentProjectController(JdbcTemplate jdbc, UserApplicationService users, ObjectMapper objectMapper) {
        this.jdbc = jdbc;
        this.users = users;
        this.objectMapper = objectMapper;
    }

    private UserEntity requireTeacher() {
        UserEntity user = users.requireCurrentUser();
        if (user.getRole() == UserRole.student) {
            throw new IllegalArgumentException("Chỉ giáo viên mới được quản lý bộ dự án");
        }
        return user;
    }

    @GetMapping
    public ResponseEntity<?> list(@RequestParam(required = false) String id) {
        UserEntity teacher = requireTeacher();
        if (id != null) {
            long projectId = parseId(id);
            List<Map<String, Object>> rows = jdbc.query(
                    "SELECT id, name, topic, curriculum_level, updated_at, questions::text FROM assignment_projects "
                            + "WHERE id = ? AND teacher_id = ?",
                    (rs, row) -> Map.of(
                            "id", String.valueOf(rs.getLong("id")),
                            "name", rs.getString("name"),
                            "topic", rs.getString("topic"),
                            "curriculumLevel", rs.getInt("curriculum_level"),
                            "updatedAt", rs.getTimestamp("updated_at").toInstant().toString(),
                            "questions", parseJson(rs.getString("questions"))
                    ),
                    projectId, teacher.getId()
            );
            if (rows.isEmpty()) {
                return error(HttpStatus.NOT_FOUND, "Không tìm thấy bộ dự án");
            }
            return ResponseEntity.ok(Map.of("project", rows.get(0)));
        }
        List<Map<String, Object>> projects = jdbc.query(
                "SELECT id, name, topic, curriculum_level, updated_at FROM assignment_projects "
                        + "WHERE teacher_id = ? ORDER BY name ASC",
                (rs, row) -> Map.of(
                        "id", String.valueOf(rs.getLong("id")),
                        "name", rs.getString("name"),
                        "topic", rs.getString("topic"),
                        "curriculumLevel", rs.getInt("curriculum_level"),
                        "updatedAt", rs.getTimestamp("updated_at").toInstant().toString()
                ),
                teacher.getId()
        );
        return ResponseEntity.ok(Map.of("projects", projects));
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> create(@RequestBody Map<String, Object> body) {
        UserEntity teacher = requireTeacher();
        String name = requireString(body, "name");
        String topic = requireString(body, "topic");
        int curriculumLevel = requireInt(body, "curriculumLevel", 1, 6);
        String questions = questionsToJson(body.get("questions"));
        jdbc.update(
                "INSERT INTO assignment_projects(teacher_id, name, topic, curriculum_level, questions) "
                        + "VALUES (?, ?, ?, ?, ?::jsonb)",
                teacher.getId(), name, topic, curriculumLevel, questions
        );
        Map<String, Object> project = jdbc.queryForObject(
                "SELECT id, name, topic, curriculum_level, updated_at FROM assignment_projects "
                        + "WHERE teacher_id = ? ORDER BY id DESC LIMIT 1",
                (rs, row) -> Map.of(
                        "id", String.valueOf(rs.getLong("id")),
                        "name", rs.getString("name"),
                        "topic", rs.getString("topic"),
                        "curriculumLevel", rs.getInt("curriculum_level"),
                        "updatedAt", rs.getTimestamp("updated_at").toInstant().toString()
                ),
                teacher.getId()
        );
        return ResponseEntity.status(201).body(Map.of("project", project));
    }

    @PatchMapping
    public ResponseEntity<?> update(@RequestBody Map<String, Object> body) {
        UserEntity teacher = requireTeacher();
        long projectId = parseId(String.valueOf(body.get("id")));
        String name = requireString(body, "name");
        String topic = requireString(body, "topic");
        int curriculumLevel = requireInt(body, "curriculumLevel", 1, 6);
        String questions = questionsToJson(body.get("questions"));
        int updated = jdbc.update(
                "UPDATE assignment_projects SET name = ?, topic = ?, curriculum_level = ?, questions = ?::jsonb, updated_at = now() "
                        + "WHERE id = ? AND teacher_id = ?",
                name, topic, curriculumLevel, questions, projectId, teacher.getId()
        );
        if (updated == 0) {
            return error(HttpStatus.NOT_FOUND, "Không tìm thấy bộ dự án");
        }
        Map<String, Object> project = jdbc.queryForObject(
                "SELECT id, name, topic, curriculum_level, updated_at FROM assignment_projects WHERE id = ?",
                (rs, row) -> Map.of(
                        "id", String.valueOf(rs.getLong("id")),
                        "name", rs.getString("name"),
                        "topic", rs.getString("topic"),
                        "curriculumLevel", rs.getInt("curriculum_level"),
                        "updatedAt", rs.getTimestamp("updated_at").toInstant().toString()
                ),
                projectId
        );
        return ResponseEntity.ok(Map.of("project", project));
    }

    @DeleteMapping
    public ResponseEntity<?> delete(@RequestParam String id) {
        UserEntity teacher = requireTeacher();
        long projectId = parseId(id);
        int deleted = jdbc.update(
                "DELETE FROM assignment_projects WHERE id = ? AND teacher_id = ?",
                projectId, teacher.getId()
        );
        if (deleted == 0) {
            return error(HttpStatus.NOT_FOUND, "Không tìm thấy bộ dự án");
        }
        return ResponseEntity.ok(Map.of("ok", true));
    }

    private JsonNode parseJson(String text) {
        try {
            return objectMapper.readTree(text);
        } catch (Exception ex) {
            return objectMapper.nullNode();
        }
    }

    private String questionsToJson(Object questions) {
        if (questions == null) {
            throw new IllegalArgumentException("questions là bắt buộc");
        }
        try {
            return objectMapper.writeValueAsString(questions);
        } catch (Exception ex) {
            throw new IllegalArgumentException("questions không hợp lệ");
        }
    }

    private long parseId(String value) {
        try {
            long id = Long.parseLong(value == null ? "" : value.trim());
            if (id < 1) {
                throw new IllegalArgumentException("id không hợp lệ");
            }
            return id;
        } catch (NumberFormatException ex) {
            throw new IllegalArgumentException("id không hợp lệ");
        }
    }

    private String requireString(Map<String, Object> body, String key) {
        if (body == null) {
            throw new IllegalArgumentException("Dữ liệu yêu cầu là bắt buộc");
        }
        Object value = body.get(key);
        if (!(value instanceof String s) || s.trim().isEmpty() || s.length() > 180) {
            throw new IllegalArgumentException(key + " không hợp lệ");
        }
        return s.trim();
    }

    private int requireInt(Map<String, Object> body, String key, int min, int max) {
        if (body == null) {
            throw new IllegalArgumentException("Dữ liệu yêu cầu là bắt buộc");
        }
        Object value = body.get(key);
        if (!(value instanceof Number n) || n.intValue() < min || n.intValue() > max) {
            throw new IllegalArgumentException(key + " không hợp lệ");
        }
        return n.intValue();
    }

    private ResponseEntity<?> error(HttpStatus status, String message) {
        return ResponseEntity.status(status).body(Map.of("message", message));
    }
}
