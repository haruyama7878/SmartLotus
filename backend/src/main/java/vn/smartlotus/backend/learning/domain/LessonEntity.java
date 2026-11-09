package vn.smartlotus.backend.learning.domain;

import java.time.Instant;
// cá nhân hóa
// dựa trên dl điểm, tốc độ người học, file dữ liệu bên trong
// biến độc lập + đặc điểm của người học
// dùng cái gì để giải quyết
// nên figh tơn hay gì
// dùng rag
// dùng vector db
// gán trọng số cho các yếu tố, đẩy trọng số lên , giáo viên có thể đẩy, can thiệp trọng số , cá nhân hóa theo cả giáo viên
// trọng số có thể làm sau,
// tăng trọng số cho từng lớp( giỏi vào giỏi)
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "lessons")
public class LessonEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false, unique = true, length = 120) private String slug;
    @Column(name = "curriculum_level", nullable = false) private int curriculumLevel;
    @Column(nullable = false, length = 180) private String title;
    @Column(nullable = false, length = 180) private String topic;
    @Column(nullable = false, columnDefinition = "text") private String competency;
    @Column(name = "question_count", nullable = false) private int questionCount = 10;
    @Column(nullable = false) private boolean published = true;
    @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt = Instant.now();

    protected LessonEntity() {}
    public Long getId() { return id; }
    public String getSlug() { return slug; }
    public int getCurriculumLevel() { return curriculumLevel; }
    public String getTitle() { return title; }
    public String getTopic() { return topic; }
    public String getCompetency() { return competency; }
    public int getQuestionCount() { return questionCount; }
}
