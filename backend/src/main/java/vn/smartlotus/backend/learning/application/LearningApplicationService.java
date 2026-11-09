package vn.smartlotus.backend.learning.application;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import vn.smartlotus.backend.identity.application.UserApplicationService;
import vn.smartlotus.backend.identity.domain.UserEntity;
import vn.smartlotus.backend.learning.domain.LessonEntity;
import vn.smartlotus.backend.learning.domain.QuizAttemptEntity;
import vn.smartlotus.backend.learning.infrastructure.LessonRepository;
import vn.smartlotus.backend.learning.infrastructure.QuizAttemptRepository;

@Service
public class LearningApplicationService {
    private final LessonRepository lessons;
    private final QuizAttemptRepository attempts;
    private final UserApplicationService users;
    private final ObjectMapper objectMapper;

    public LearningApplicationService(
        LessonRepository lessons,
        QuizAttemptRepository attempts,
        UserApplicationService users,
        ObjectMapper objectMapper
    ) {
        this.lessons = lessons;
        this.attempts = attempts;
        this.users = users;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public List<LessonEntity> publishedLessons() {
        return lessons.findByPublishedTrueOrderByCurriculumLevelAscIdAsc();
    }

    @Transactional
    public QuizAttemptEntity submitAttempt(QuizAttemptCommand command) {
        if (command.correctAnswers() < 0 || command.correctAnswers() > command.totalQuestions()) {
            throw new IllegalArgumentException("Số câu đúng không hợp lệ");
        }
        if (command.totalQuestions() <= 0 || command.score() < 0 || command.score() > 100) {
            throw new IllegalArgumentException("Kết quả bài làm không hợp lệ");
        }
        int expectedScore = Math.round(command.correctAnswers() * 100f / command.totalQuestions());
        if (command.score() != expectedScore) {
            throw new IllegalArgumentException("Điểm không khớp với số câu trả lời đúng");
        }
        LessonEntity lesson = lessons.findBySlug(command.lessonSlug()).orElse(null);
        UserEntity user = users.requireCurrentUser();
        QuizAttemptEntity attempt = new QuizAttemptEntity(user, lesson, new QuizAttemptEntity.AttemptData(
            command.lessonSlug(), command.correctAnswers(), command.totalQuestions(), command.score(),
            command.durationSeconds(), command.highestDifficulty(), command.answers().toString()
        ));
        user.addPoints(Math.max(1, command.score() / 10));
        user.markActive();
        return attempts.save(attempt);
    }

    public record QuizAttemptCommand(
        String lessonSlug,
        int correctAnswers,
        int totalQuestions,
        int score,
        int durationSeconds,
        String highestDifficulty,
        JsonNode answers
    ) {}
}
