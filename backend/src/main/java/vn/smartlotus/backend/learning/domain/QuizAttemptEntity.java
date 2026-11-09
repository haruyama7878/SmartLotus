package vn.smartlotus.backend.learning.domain;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import vn.smartlotus.backend.identity.domain.UserEntity;

@Entity
@Table(name = "quiz_attempts")
public class QuizAttemptEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @jakarta.persistence.ManyToOne(optional = false) @jakarta.persistence.JoinColumn(name = "user_id") private UserEntity user;
    @jakarta.persistence.ManyToOne @jakarta.persistence.JoinColumn(name = "lesson_id") private LessonEntity lesson;
    @Column(name = "lesson_slug", nullable = false, length = 120) private String lessonSlug;
    @Column(name = "correct_answers", nullable = false) private int correctAnswers;
    @Column(name = "total_questions", nullable = false) private int totalQuestions;
    @Column(nullable = false) private int score;
    @Column(name = "duration_seconds", nullable = false) private int durationSeconds;
    @Enumerated(EnumType.STRING) @JdbcTypeCode(SqlTypes.NAMED_ENUM) @Column(name = "highest_difficulty", nullable = false, columnDefinition = "difficulty") private Difficulty highestDifficulty;
    @JdbcTypeCode(SqlTypes.JSON) @Column(nullable = false, columnDefinition = "jsonb") private String answers;
    @Column(name = "completed_at", nullable = false) private Instant completedAt = Instant.now();

    protected QuizAttemptEntity() {}
    public QuizAttemptEntity(UserEntity user, LessonEntity lesson, AttemptData data) {
        this.user = user; this.lesson = lesson; this.lessonSlug = data.lessonSlug();
        this.correctAnswers = data.correctAnswers(); this.totalQuestions = data.totalQuestions();
        this.score = data.score(); this.durationSeconds = data.durationSeconds();
        this.highestDifficulty = Difficulty.valueOf(data.highestDifficulty()); this.answers = data.answers();
    }
    public Long getId() { return id; }
    public int getScore() { return score; }
    public int getCorrectAnswers() { return correctAnswers; }
    public int getTotalQuestions() { return totalQuestions; }
    public int getDurationSeconds() { return durationSeconds; }
    public String getLessonSlug() { return lessonSlug; }
    public Instant getCompletedAt() { return completedAt; }
    public record AttemptData(String lessonSlug, int correctAnswers, int totalQuestions, int score, int durationSeconds, String highestDifficulty, String answers) {}
}
