package vn.smartlotus.backend.learning.application;

import java.util.List;

import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import vn.smartlotus.backend.identity.application.UserApplicationService;
import vn.smartlotus.backend.identity.domain.UserEntity;
import vn.smartlotus.backend.learning.domain.LessonEntity;
import vn.smartlotus.backend.learning.domain.PersonalizationEngine;
import vn.smartlotus.backend.learning.domain.PersonalizationResult;
import vn.smartlotus.backend.learning.domain.QuizAttemptEntity;
import vn.smartlotus.backend.learning.infrastructure.LessonRepository;
import vn.smartlotus.backend.learning.infrastructure.PersonalizationConfigGateway;
import vn.smartlotus.backend.learning.infrastructure.PersonalizationConfigGateway.Config;
import vn.smartlotus.backend.learning.infrastructure.QuizAttemptRepository;

/**
 * Orchestrator của Trái tim cá nhân hóa: lấy dữ liệu thật trong hệ thống
 * (RAG context của bài học, metric làm bài gần nhất, đặc điểm từ placement,
 * trọng số giáo viên theo lớp), đưa qua {@link PersonalizationEngine} rồi gọi
 * {@link GemmaAdaptiveTutorService} để sinh bộ câu hỏi JSON cá nhân hóa.
 */
@Service
public class PersonalizationApplicationService {

    // Trọng số mặc định khi giáo viên chưa cấu hình cho lớp (khớp default trong V4).
    private static final double DEFAULT_W_SCORE = 0.50;
    private static final double DEFAULT_W_SPEED = 0.30;
    private static final double DEFAULT_W_TRAIT = 0.20;
    private static final double DEFAULT_CLASS_BOOST = 0.0;
    private static final String DEFAULT_TEACHER_STYLE =
            "Vui vẻ, lấy ví dụ trực quan gần gũi với học sinh lớp 1";

    private static final int[] LEVEL_WEIGHTS = {1, 2, 3, 4, 5, 6};
    private static final int QUESTIONS_PER_LEVEL = 5;

    private final UserApplicationService users;
    private final LessonRepository lessons;
    private final QuizAttemptRepository attempts;
    private final PersonalizationConfigGateway configGateway;
    private final GemmaAdaptiveTutorService gemma;
    private final ObjectMapper objectMapper;

    public PersonalizationApplicationService(
            UserApplicationService users,
            LessonRepository lessons,
            QuizAttemptRepository attempts,
            PersonalizationConfigGateway configGateway,
            GemmaAdaptiveTutorService gemma,
            ObjectMapper objectMapper
    ) {
        this.users = users;
        this.lessons = lessons;
        this.attempts = attempts;
        this.configGateway = configGateway;
        this.gemma = gemma;
        this.objectMapper = objectMapper;
    }

    /**
     * Sinh bộ câu hỏi cá nhân hóa cho một bài học, dựa trên hồ sơ & lịch sử làm bài
     * của học sinh hiện tại. Trả về JsonNode cấu trúc theo prompt của Gemma.
     */
    public JsonNode generateAdaptiveQuiz(String lessonSlug, int requestedCount) {
        UserEntity user = users.requireCurrentUser();
        LessonEntity lesson = lessons.findBySlug(lessonSlug)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy bài học: " + lessonSlug));

        int questionCount = Math.max(1, Math.min(20, requestedCount > 0 ? requestedCount : lesson.getQuestionCount()));

        // 1. Metric làm bài gần nhất (ưu tiên bài này, fallback bài gần nhất bất kỳ).
        List<QuizAttemptEntity> recent = attempts.findTop10ByUserAndLessonSlugOrderByCompletedAtDesc(user, lessonSlug);
        if (recent.isEmpty()) {
            recent = attempts.findTop10ByUserOrderByCompletedAtDesc(user);
        }
        QuizAttemptEntity metric = recent.isEmpty() ? null : recent.get(0);

        int totalQuestions = metric != null ? metric.getTotalQuestions() : lesson.getQuestionCount();
        int correctAnswers = metric != null ? metric.getCorrectAnswers() : totalQuestions / 2;
        int durationSeconds = metric != null ? metric.getDurationSeconds() : totalQuestions * 30;

        // 2. Đặc điểm người học từ placement JSONB (0.0 -> 1.0) + mô tả phong cách.
        JsonNode placement = parsePlacement(user.getPlacement());
        double traitScore = placement != null ? traitScoreFromPlacement(placement) : 0.5;
        String learningStyle = describeLearningStyle(traitScore, placement);

        // 3. Trọng số giáo viên theo lớp (nếu có), ngược lại dùng default.
        Config config = configGateway.findConfigForStudent(user.getId()).orElseGet(this::defaultConfig);
        double wScore = orFallback(config.wScore(), DEFAULT_W_SCORE);
        double wSpeed = orFallback(config.wSpeed(), DEFAULT_W_SPEED);
        double wTrait = orFallback(config.wTrait(), DEFAULT_W_TRAIT);
        double classBoost = orFallback(config.classBoost(), DEFAULT_CLASS_BOOST);
        String teacherStyle = config.teacherStylePrompt() != null && !config.teacherStylePrompt().isBlank()
                ? config.teacherStylePrompt() : DEFAULT_TEACHER_STYLE;

        // 4. Tính mức độ khó mục tiêu bằng Trái tim.
        PersonalizationResult result = PersonalizationEngine.compute(
                correctAnswers, totalQuestions, durationSeconds,
                traitScore, learningStyle,
                wScore, wSpeed, wTrait, classBoost, user.getCurrentStreak()
        );

        // 5. Sinh câu hỏi bằng Gemma với RAG context của bài học.
        String modelOutput = gemma.generateAdaptiveQuestionsJson(
                lesson.getTitle(), lesson.getTopic(), lesson.getCompetency(),
                result, teacherStyle, questionCount
        );

        return parseModelOutput(modelOutput, questionCount, result.targetDifficulty().name());
    }

    private Config defaultConfig() {
        return new Config(DEFAULT_W_SCORE, DEFAULT_W_SPEED, DEFAULT_W_TRAIT, DEFAULT_CLASS_BOOST, DEFAULT_TEACHER_STYLE);
    }

    private double orFallback(double value, double fallback) {
        return Double.isFinite(value) ? value : fallback;
    }

    private JsonNode parsePlacement(String placementJson) {
        if (placementJson == null || placementJson.isBlank()) {
            return null;
        }
        try {
            JsonNode node = objectMapper.readTree(placementJson);
            return node.has("perLevelCorrect") ? node : null;
        } catch (com.fasterxml.jackson.core.JsonProcessingException exception) {
            return null;
        }
    }

    /** Tính điểm đặc điểm 0..1 từ perLevelCorrect (trọng số tăng dần theo level). */
    private double traitScoreFromPlacement(JsonNode placement) {
        JsonNode perLevel = placement.path("perLevelCorrect");
        if (!perLevel.isArray() || perLevel.size() == 0) {
            return 0.5;
        }
        double weightedCorrect = 0.0;
        double weightedTotal = 0.0;
        for (int i = 0; i < perLevel.size(); i++) {
            int weight = LEVEL_WEIGHTS[Math.min(i, LEVEL_WEIGHTS.length - 1)];
            int correct = Math.max(0, Math.min(QUESTIONS_PER_LEVEL, perLevel.get(i).asInt(0)));
            weightedCorrect += correct * weight;
            weightedTotal += QUESTIONS_PER_LEVEL * weight;
        }
        return weightedTotal > 0 ? Math.min(1.0, weightedCorrect / weightedTotal) : 0.5;
    }

    private String describeLearningStyle(double traitScore, JsonNode placement) {
        int level = placement != null && placement.has("level") ? placement.path("level").asInt(1) : 1;
        String base;
        if (traitScore < 0.4) {
            base = "Cần nhiều hỗ trợ, học chậm, ưu tiên ví dụ trực quan cụ thể (đồ vật, hình ảnh)";
        } else if (traitScore < 0.7) {
            base = "Nhận biết trung bình, kết hợp hình ảnh và thực hành từng bước";
        } else {
            base = "Nắm chắc nền tảng, sẵn sàng tư duy logic và bài nâng cao";
        }
        return "Placement level " + level + " — " + base;
    }

    /** Parse và kiểm tra output model trước khi trả về cho client. */
    private JsonNode parseModelOutput(String modelOutput, int expectedCount, String expectedDifficulty) {
        try {
            JsonNode output = objectMapper.readTree(modelOutput);
            JsonNode questions = output != null ? output.path("questions") : null;
            if (output == null || !output.isObject() || questions == null || !questions.isArray()
                    || questions.size() != expectedCount
                    || !expectedDifficulty.equals(output.path("assigned_difficulty").asText())) {
                throw new IllegalStateException("Gemma trả về bộ câu hỏi không đúng cấu trúc hoặc mức độ yêu cầu.");
            }
            for (JsonNode question : questions) {
                if (!question.isObject()
                        || !question.path("question_text").isTextual()
                        || question.path("question_text").asText().isBlank()
                        || !question.path("options").isArray()
                        || question.path("options").size() < 2
                        || !question.path("correct_answer").isTextual()
                        || !expectedDifficulty.equals(question.path("difficulty").asText())) {
                    throw new IllegalStateException("Gemma trả về câu hỏi không hợp lệ.");
                }
            }
            return output;
        } catch (com.fasterxml.jackson.core.JsonProcessingException exception) {
            throw new IllegalStateException("Gemma trả về JSON không hợp lệ.", exception);
        }
    }
}
