package vn.smartlotus.backend.classroom.interfaces.rest;

import java.util.List;
import java.util.Map;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import vn.smartlotus.backend.identity.application.UserApplicationService;
import vn.smartlotus.backend.identity.domain.UserEntity;
import vn.smartlotus.backend.identity.domain.UserRole;

/**
 * Lời mời vào lớp dành cho học sinh: xem các lời mời pending và phản hồi
 * (chấp nhận → thêm thành viên; từ chối → chỉ cập nhật trạng thái).
 */
@RestController
@RequestMapping("/api/classroom-invitations")
public class ClassroomInvitationController {

    private final JdbcTemplate jdbc;
    private final UserApplicationService users;

    public ClassroomInvitationController(JdbcTemplate jdbc, UserApplicationService users) {
        this.jdbc = jdbc;
        this.users = users;
    }

    @GetMapping
    public Map<String, Object> list() {
        UserEntity student = users.requireCurrentUser();
        if (student.getRole() != UserRole.student) {
            throw new IllegalArgumentException("Chỉ học sinh mới có lời mời lớp");
        }
        List<Map<String, Object>> invitations = jdbc.query(
                """
                SELECT ci.id, ci.classroom_id, c.name classroom_name, c.label classroom_label,
                       c.subject, u.display_name teacher_name, ci.created_at
                FROM classroom_invitations ci
                JOIN classrooms c ON c.id = ci.classroom_id
                JOIN users u ON u.id = c.teacher_id
                WHERE ci.student_id = ? AND ci.status = 'pending'
                ORDER BY ci.created_at ASC
                """,
                (rs, row) -> Map.of(
                        "id", String.valueOf(rs.getLong("id")),
                        "classroomId", String.valueOf(rs.getLong("classroom_id")),
                        "classroomName", rs.getString("classroom_name"),
                        "classroomLabel", rs.getString("classroom_label"),
                        "subject", rs.getString("subject"),
                        "teacherName", rs.getString("teacher_name"),
                        "createdAt", rs.getTimestamp("created_at").toInstant().toString()
                ),
                student.getId()
        );
        return Map.of("invitations", invitations);
    }

    @PatchMapping("/{invitationId}")
    @Transactional
    public Map<String, Object> respond(@PathVariable long invitationId, @RequestBody Map<String, String> body) {
        UserEntity student = users.requireCurrentUser();
        if (student.getRole() != UserRole.student) {
            throw new IllegalArgumentException("Chỉ học sinh mới có thể phản hồi lời mời");
        }
        String decision = body == null ? null : body.get("decision");
        if (!"accepted".equals(decision) && !"declined".equals(decision)) {
            throw new IllegalArgumentException("Phản hồi lời mời không hợp lệ");
        }
        List<Long> rows = jdbc.queryForList(
                "SELECT classroom_id FROM classroom_invitations WHERE id = ? AND student_id = ? AND status = 'pending'",
                Long.class, invitationId, student.getId());
        if (rows.isEmpty()) {
            throw new IllegalArgumentException("Lời mời không còn hiệu lực");
        }
        long classroomId = rows.get(0);
        if ("accepted".equals(decision)) {
            jdbc.update(
                    "INSERT INTO classroom_memberships(classroom_id, student_id) VALUES (?, ?) ON CONFLICT DO NOTHING",
                    classroomId, student.getId());
        }
        jdbc.update(
                "UPDATE classroom_invitations SET status = ?, responded_at = now() WHERE id = ?",
                decision, invitationId);
        return Map.of("invitation", Map.of("id", String.valueOf(invitationId), "status", decision));
    }
}
