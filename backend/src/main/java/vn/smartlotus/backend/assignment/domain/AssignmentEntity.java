package vn.smartlotus.backend.assignment.domain;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import vn.smartlotus.backend.classroom.domain.ClassroomEntity;

@Entity
@Table(name = "classroom_assignments")
public class AssignmentEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(optional = false) @JoinColumn(name = "classroom_id") private ClassroomEntity classroom;
    @Column(nullable = false, length = 180) private String title;
    @Column(nullable = false, length = 180) private String topic;
    @Column(name = "curriculum_level", nullable = false) private int curriculumLevel;
    @Column(name = "due_at", nullable = false) private Instant dueAt;
    @Column(name = "duration_minutes", nullable = false) private int durationMinutes;
    @JdbcTypeCode(SqlTypes.JSON) @Column(nullable = false, columnDefinition = "jsonb") private String questions;
    @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt = Instant.now();

    protected AssignmentEntity() {}
    public AssignmentEntity(ClassroomEntity classroom, String title, String topic, int curriculumLevel,
                            Instant dueAt, int durationMinutes, String questions) {
        this.classroom = classroom; this.title = title; this.topic = topic; this.curriculumLevel = curriculumLevel;
        this.dueAt = dueAt; this.durationMinutes = durationMinutes; this.questions = questions;
    }
    public Long getId() { return id; }
    public ClassroomEntity getClassroom() { return classroom; }
    public String getTitle() { return title; }
    public String getTopic() { return topic; }
    public int getCurriculumLevel() { return curriculumLevel; }
    public Instant getDueAt() { return dueAt; }
    public int getDurationMinutes() { return durationMinutes; }
    public String getQuestions() { return questions; }
    public Instant getCreatedAt() { return createdAt; }
}
