package vn.smartlotus.backend.learning.interfaces.rest;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import vn.smartlotus.backend.learning.application.LearningApplicationService;

@RestController
@RequestMapping("/api/attempts")
public class AttemptController {
    private final LearningApplicationService learning;

    public AttemptController(LearningApplicationService learning) { this.learning = learning; }

    @PostMapping
    public ResponseEntity<AttemptResponse> submit(@Valid @RequestBody AttemptRequest request) {
        var attempt = learning.submitAttempt(new LearningApplicationService.QuizAttemptCommand(
            request.lessonSlug(), request.correctAnswers(), request.totalQuestions(), request.score(),
            request.durationSeconds(), request.highestDifficulty(), request.answers()
        ));
        return ResponseEntity.ok(new AttemptResponse(true, attempt.getId(), 0));
    }

    public record AttemptRequest(
        @NotBlank String lessonSlug,
        @Min(0) int correctAnswers,
        @Min(1) int totalQuestions,
        @Min(0) @Max(100) int score,
        @Min(0) @Max(86_400) int durationSeconds,
        @NotBlank String highestDifficulty,
        @NotNull JsonNode answers
    ) {}
    public record AttemptResponse(boolean ok, long attemptId, int totalPoints) {}
}
