package vn.smartlotus.backend.learning.domain;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class PersonalizationEngineTest {
    @Test
    void combinesPlacementAndStreakWithoutLettingStreakDominate() {
        PersonalizationResult noStreak = compute(0);
        PersonalizationResult activeStreak = compute(7);

        assertThat(activeStreak.learnerTraitIndex()).isGreaterThan(noStreak.learnerTraitIndex());
        assertThat(activeStreak.learnerTraitIndex()).isLessThan(1.0);
        assertThat(activeStreak.finalWeightedScore()).isGreaterThan(noStreak.finalWeightedScore());
    }

    @Test
    void sanitizesInvalidInputsToFiniteBoundedOutput() {
        PersonalizationResult result = PersonalizationEngine.compute(
                99, -1, -1, Double.NaN, "visual",
                -1.0, Double.NaN, Double.POSITIVE_INFINITY, Double.NaN, -4);

        assertThat(result.normalizedScore()).isBetween(0.0, 1.0);
        assertThat(result.normalizedSpeed()).isBetween(0.0, 1.0);
        assertThat(result.learnerTraitIndex()).isBetween(0.0, 1.0);
        assertThat(result.finalWeightedScore()).isBetween(0.0, 1.0);
        assertThat(result.targetDifficulty()).isNotNull();
    }

    private PersonalizationResult compute(int currentStreak) {
        return PersonalizationEngine.compute(
                8, 10, 300, 0.6, "visual",
                0.5, 0.3, 0.2, 0.0, currentStreak);
    }
}
