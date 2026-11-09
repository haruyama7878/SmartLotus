package vn.smartlotus.backend.learning.infrastructure;

import java.util.Optional;

import javax.sql.DataSource;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Read-side gateway cho trọng số cá nhân hóa. Truy vấn {@code classroom_memberships}
 * để tìm lớp gần nhất của học sinh, sau đó nạp {@code personalization_configs} tương ứng
 * (trọng số giáo viên + độ đẩy lớp + phong cách dạy). Dùng JdbcTemplate để không phải
 * ánh xạ JPA cho các bảng phụ trợ này.
 */
@Component
public class PersonalizationConfigGateway {

    private final JdbcTemplate jdbc;

    public PersonalizationConfigGateway(DataSource dataSource) {
        this.jdbc = new JdbcTemplate(dataSource);
    }

    /** Trọng số cá nhân hóa của một lớp, do giáo viên can thiệp. */
    public record Config(double wScore, double wSpeed, double wTrait, double classBoost, String teacherStylePrompt) {
    }

    /** Tìm classroom_id mới nhất của học sinh (theo joined_at). */
    private Optional<Long> findStudentClassroomId(Long userId) {
        return jdbc.query(
                "SELECT classroom_id FROM classroom_memberships WHERE student_id = ? ORDER BY joined_at DESC LIMIT 1",
                (rs, rowNum) -> rs.getLong("classroom_id"),
                userId
        ).stream().findFirst();
    }

    /** Nạp trọng số cá nhân hóa cho lớp của học sinh (nếu giáo viên đã cấu hình). */
    public Optional<Config> findConfigForStudent(Long userId) {
        Optional<Long> classroomId = findStudentClassroomId(userId);
        if (classroomId.isEmpty()) {
            return Optional.empty();
        }
        return jdbc.query(
                """
                SELECT w_score, w_speed, w_trait, class_boost, teacher_style_prompt
                FROM personalization_configs WHERE classroom_id = ?
                """,
                (rs, rowNum) -> new Config(
                        rs.getDouble("w_score"),
                        rs.getDouble("w_speed"),
                        rs.getDouble("w_trait"),
                        rs.getDouble("class_boost"),
                        rs.getString("teacher_style_prompt")
                ),
                classroomId.get()
        ).stream().findFirst();
    }
}
