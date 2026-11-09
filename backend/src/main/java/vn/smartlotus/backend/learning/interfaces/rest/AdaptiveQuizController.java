package vn.smartlotus.backend.learning.interfaces.rest;

import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.fasterxml.jackson.databind.JsonNode;

import vn.smartlotus.backend.learning.application.PersonalizationApplicationService;

/**
 * Endpoint kích hoạt Trái tim cá nhân hóa: sinh bộ câu hỏi Toán lớp 1 cá nhân hóa
 * cho học sinh hiện tại theo bài học chỉ định. Dữ liệu đầu vào (metric làm bài,
 * placement, trọng số giáo viên theo lớp) được hệ thống tự thu thập — caller chỉ
 * cần gửi số câu hỏi mong muốn.
 */
@RestController
@RequestMapping("/api/lessons")
public class AdaptiveQuizController {

    private final PersonalizationApplicationService personalization;

    public AdaptiveQuizController(PersonalizationApplicationService personalization) {
        this.personalization = personalization;
    }

    @PostMapping("/{slug}/generate-adaptive")
    public ResponseEntity<?> generateAdaptive(
            @PathVariable String slug,
            @RequestBody(required = false) GenerateAdaptiveRequest request
    ) {
        int questionCount = request != null && request.questionCount() != null && request.questionCount() > 0
                ? request.questionCount() : 10;
        try {
            JsonNode quiz = personalization.generateAdaptiveQuiz(slug, questionCount);
            return ResponseEntity.ok(quiz);
        } catch (IllegalStateException ex) {
            // Lỗi cấu hình (thiếu GEMMA_API_KEY) hoặc lỗi gọi Gemma → 503.
            return ResponseEntity.status(503).body(Map.of("message", ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    public record GenerateAdaptiveRequest(Integer questionCount) {
    }
}
