package vn.smartlotus.backend.learning.application;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;

import com.fasterxml.jackson.databind.node.NullNode;
import org.junit.jupiter.api.Test;

import vn.smartlotus.backend.identity.application.UserApplicationService;
import vn.smartlotus.backend.learning.domain.Difficulty;
import vn.smartlotus.backend.learning.infrastructure.LessonRepository;
import vn.smartlotus.backend.learning.infrastructure.QuizAttemptRepository;

class LearningApplicationServiceTest {
    private final LearningApplicationService service = new LearningApplicationService(
        mock(LessonRepository.class),
        mock(QuizAttemptRepository.class),
        mock(UserApplicationService.class),
        null
    );

    @Test
    void rejectsScoreThatDoesNotMatchCorrectAnswers() {
        LearningApplicationService.QuizAttemptCommand command =
            new LearningApplicationService.QuizAttemptCommand(
                "so-nguyen-co-ban", 5, 10, 100, 30, "A", NullNode.getInstance());

        assertThatThrownBy(() -> service.submitAttempt(command))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessage("Điểm không khớp với số câu trả lời đúng");
    }

    @Test
    void mapsDifficultyBoundariesToExpectedLevels() {
        org.assertj.core.api.Assertions.assertThat(Difficulty.fromWeightedIndex(0.0)).isEqualTo(Difficulty.A);
        org.assertj.core.api.Assertions.assertThat(Difficulty.fromWeightedIndex(0.999)).isEqualTo(Difficulty.E);
        org.assertj.core.api.Assertions.assertThat(Difficulty.fromWeightedIndex(-1.0)).isEqualTo(Difficulty.A);
        org.assertj.core.api.Assertions.assertThat(Difficulty.fromWeightedIndex(2.0)).isEqualTo(Difficulty.E);
    }
}
