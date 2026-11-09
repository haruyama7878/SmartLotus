package vn.smartlotus.backend.learning.application;

import java.util.List;
import java.util.Map;
import java.time.Duration;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.ratelimiter.annotation.RateLimiter;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import vn.smartlotus.backend.learning.domain.PersonalizationResult;

/**
 * Adapter gọi mô hình Gemma (qua Google AI Studio endpoint) để sinh câu hỏi
 * Toán lớp 1 được cá nhân hóa. Đây là lớp "sinh lời" của Trái tim cá nhân hóa —
 * nhận {@link PersonalizationResult} đã qua bộ trọng số và xuất ra JSON câu hỏi.
 *
 * <p>Cấu hình qua env: {@code GEMMA_API_KEY} (bắt buộc khi gọi), {@code GEMMA_API_MODEL}
 * (mặc định {@code gemma-4-31b-it}), {@code GEMMA_API_BASE_URL}.
 */
@Service
public class GemmaAdaptiveTutorService {

    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    /** API key lấy từ https://aistudio.google.com/apikey. Bắt buộc để sinh câu hỏi. */
    @Value("${gemma.api.key:}")
    private String apiKey;

    /** Tên model trên Google AI Studio. Có thể đổi qua env GEMMA_API_MODEL. */
    @Value("${gemma.api.model:gemma-4-31b-it}")
    private String model;

    public GemmaAdaptiveTutorService(
            RestClient.Builder builder,
            ObjectMapper objectMapper,
            @Value("${gemma.api.base-url:https://generativelanguage.googleapis.com/v1beta}") String baseUrl
    ) {
        this.objectMapper = objectMapper;
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofSeconds(5));
        requestFactory.setReadTimeout(Duration.ofSeconds(30));
        this.restClient = builder
            .requestFactory(requestFactory)
            .baseUrl(baseUrl)
            .build();
    }

    @CircuitBreaker(name = "gemma", fallbackMethod = "gemmaFallback")
    @RateLimiter(name = "gemma")
    public String generateAdaptiveQuestionsJson(
            String lessonTitle,
            String lessonTopic,
            String ragCompetencyContext, // Lấy từ cột lessons.competency
            PersonalizationResult studentMetrics,
            String teacherStylePrompt,   // Lấy từ personalization_configs.teacher_style_prompt
            int questionCount
    ) {
        if (apiKey == null || apiKey.isBlank()) {
            throw new IllegalStateException(
                    "Chưa cấu hình GEMMA_API_KEY — không thể sinh câu hỏi cá nhân hóa từ Gemma.");
        }

        String prompt = """
            Bạn là Trái tim AI Cá nhân hóa môn Toán lớp 1 của hệ thống SmartLotus.

            [1. THÔNG SỐ CÁ NHÂN HÓA CỦA HỌC SINH (ĐÃ QUA BỘ TRỌNG SỐ)]
            - Tỉ lệ làm đúng hiện tại: %.0f%%
            - Chỉ số tốc độ phản xạ: %.2f/1.00
            - Đặc điểm nhận thức & Phong cách học (từ hồ sơ placement): %s
            - Điểm trọng số tổng hợp: %.2f -> XẾP MỨC ĐỘ KHÓ MỤC TIÊU: Mức %s (Thang A: Dễ nhất -> E: Mũi nhọn/Giỏi)

            [2. CÁ NHÂN HÓA THEO PHONG CÁCH GIÁO VIÊN ĐỨNG LỚP]
            - Yêu cầu riêng của giáo viên: "%s"

            [3. DỮ LIỆU GỐC BÊN TRONG HỆ THỐNG (RAG CONTEXT - CHUẨN TIỂU HỌC FPT)]
            - Bài học: %s (Chủ đề: %s)
            - Khung năng lực & Phương pháp gốc: "%s"

            [NHIỆM VỤ]
            Hãy sinh ra đúng %d câu hỏi Toán lớp 1 được cá nhân hóa chặt chẽ ở **Mức %s** và 1 lời khuyên ngắn cho bé.
            Trả về DUY NHẤT chuỗi JSON hợp lệ (không bọc trong markdown ```json) để lưu trực tiếp vào cột `questions JSONB` trong PostgreSQL theo cấu trúc:
            {
              "personalized_greeting": "Lời động viên và hướng dẫn ngắn gọn theo đúng phong cách giáo viên",
              "assigned_difficulty": "%s",
              "questions": [
                {
                  "id": 1,
                  "difficulty": "%s",
                  "question_text": "Nội dung câu hỏi phù hợp trẻ 6 tuổi...",
                  "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
                  "correct_answer": "A",
                  "step_by_step_hint": "Gợi ý từng bước nếu bé làm sai"
                }
              ]
            }
            """.formatted(
                    studentMetrics.normalizedScore() * 100,
                    studentMetrics.normalizedSpeed(),
                    studentMetrics.studentLearningStyle(),
                    studentMetrics.finalWeightedScore(),
                    studentMetrics.targetDifficulty().name(),
                    teacherStylePrompt,
                    lessonTitle,
                    lessonTopic,
                    ragCompetencyContext,
                    questionCount,
                    studentMetrics.targetDifficulty().name(),
                    studentMetrics.targetDifficulty().name(),
                    studentMetrics.targetDifficulty().name()
            );

        Map<String, Object> body = Map.of(
                "contents", List.of(
                        Map.of("parts", List.of(Map.of("text", prompt)))
                ),
                "generationConfig", Map.of(
                        "temperature", 0.35
                )
        );

        // Gọi Gemma qua Google AI Studio endpoint
        String rawResponse;
        try {
            rawResponse = restClient.post()
                    .uri("/models/" + model + ":generateContent")
                    .header("x-goog-api-key", apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(String.class);
        } catch (org.springframework.web.client.RestClientResponseException ex) {
            throw new IllegalStateException(
                    "Gemma API lỗi (HTTP " + ex.getStatusCode() + "): " + ex.getResponseBodyAsString(),
                    ex
            );
        } catch (org.springframework.web.client.RestClientException ex) {
            throw new IllegalStateException("Không kết nối được tới Gemma API.", ex);
        }

        return extractGeneratedText(rawResponse);
    }

    private String gemmaFallback(
            String lessonTitle,
            String lessonTopic,
            String ragCompetencyContext,
            PersonalizationResult studentMetrics,
            String teacherStylePrompt,
            int questionCount,
            Throwable cause
    ) {
        if (cause instanceof IllegalStateException stateException
                && stateException.getMessage() != null
                && stateException.getMessage().startsWith("Chưa cấu hình GEMMA_API_KEY")) {
            throw stateException;
        }
        throw new IllegalStateException("Gemma tạm thời không khả dụng, vui lòng thử lại sau.", cause);
    }

    /**
     * Trích phần text do model sinh từ phản hồi JSON của Google Generative API.
     * Cấu trúc: candidates[0].content.parts[0].text. Nếu API trả lỗi, ném thông báo rõ ràng.
     */
    private String extractGeneratedText(String rawResponse) {
        if (rawResponse == null || rawResponse.isBlank()) {
            throw new IllegalStateException("Gemma không trả về nội dung.");
        }
        try {
            JsonNode root = objectMapper.readTree(rawResponse);
            JsonNode text = root.path("candidates").path(0).path("content").path("parts").path(0).path("text");
            if (!text.isMissingNode() && !text.asText("").isBlank()) {
                return text.asText();
            }
            JsonNode error = root.path("error").path("message");
            if (!error.isMissingNode()) {
                throw new IllegalStateException("Gemma API báo lỗi: " + error.asText());
            }
            // Không tìm thấy text — trả về nguyên bản để debug.
            return rawResponse;
        } catch (com.fasterxml.jackson.core.JsonProcessingException exception) {
            throw new IllegalStateException("Không đọc được phản hồi từ Gemma.", exception);
        }
    }
}
