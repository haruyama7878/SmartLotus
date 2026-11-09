package vn.smartlotus.backend.learning.domain;

/**
 * Trái tim AI Cá nhân hóa môn Toán lớp 1 của hệ thống SmartLotus.
 *
 * <p>Tính mức độ khó mục tiêu cho từng học sinh dựa trên:
 * <ol>
 *   <li>Điểm làm bài gần nhất (correctAnswers / totalQuestions)</li>
 *   <li>Tốc độ làm bài (durationSeconds so với thời gian chuẩn 30s/câu của lớp 1)</li>
 *   <li>Đặc điểm người học (lấy từ student_profiles.placement JSONB &amp; current_streak)</li>
 *   <li>Trọng số của giáo viên (wScore, wSpeed, wTrait) + Hệ số đẩy lớp (classBoost)</li>
 * </ol>
 */
public final class PersonalizationEngine {
    private static final double DEFAULT_TRAIT_SCORE = 0.5;
    private static final double DEFAULT_SCORE_WEIGHT = 0.5;
    private static final double DEFAULT_SPEED_WEIGHT = 0.3;
    private static final double DEFAULT_TRAIT_WEIGHT = 0.2;
    private static final double MAX_CLASS_BOOST = 0.5;
    private static final int STREAK_CONFIDENCE_DAYS = 7;

    private PersonalizationEngine() {
    }

    public static PersonalizationResult compute(
            int correctAnswers,
            int totalQuestions,
            int durationSeconds,
            double traitScoreFromPlacement, // 0.0 -> 1.0 trích xuất từ cột placement JSONB
            String learningStyle,           // VD: "Trực quan bằng hình ảnh/kẹo/Lego"
            double wScore,
            double wSpeed,
            double wTrait,
            double classBoost,              // Giáo viên đẩy trọng số cho lớp giỏi (VD: +0.20)
            int currentStreak
    ) {
        // 1. Chuẩn hóa điểm (0.0 -> 1.0)
        double normScore = totalQuestions > 0
                ? clamp((double) correctAnswers / totalQuestions, 0.0, 1.0)
                : DEFAULT_TRAIT_SCORE;

        // 2. Chuẩn hóa tốc độ (Chuẩn lớp 1: 30 giây/câu -> 10 câu là 300s)
        double expectedSeconds = Math.max(1, totalQuestions) * 30.0;
        double normSpeed = durationSeconds > 0
                ? clamp(expectedSeconds / durationSeconds, 0.1, 1.0)
                : DEFAULT_TRAIT_SCORE;
        // Nếu làm nhanh nhưng sai nhiều (đoán mò), kìm hãm trọng số tốc độ lại:
        if (normScore < 0.4) {
            normSpeed *= normScore;
        }

        double placementTrait = clampFinite(traitScoreFromPlacement, DEFAULT_TRAIT_SCORE, 0.0, 1.0);
        double streakSignal = clamp((double) Math.max(0, currentStreak) / STREAK_CONFIDENCE_DAYS, 0.0, 1.0);
        double learnerTrait = (placementTrait * 0.85) + (streakSignal * 0.15);

        // 3. Tổng hợp theo trọng số Giáo viên + Độ đẩy của lớp (Giỏi vào giỏi)
        double safeScoreWeight = nonNegativeFinite(wScore, DEFAULT_SCORE_WEIGHT);
        double safeSpeedWeight = nonNegativeFinite(wSpeed, DEFAULT_SPEED_WEIGHT);
        double safeTraitWeight = nonNegativeFinite(wTrait, DEFAULT_TRAIT_WEIGHT);
        double totalWeight = safeScoreWeight + safeSpeedWeight + safeTraitWeight;
        if (totalWeight == 0.0) {
            safeScoreWeight = DEFAULT_SCORE_WEIGHT;
            safeSpeedWeight = DEFAULT_SPEED_WEIGHT;
            safeTraitWeight = DEFAULT_TRAIT_WEIGHT;
            totalWeight = 1.0;
        }
        double weighted = ((safeScoreWeight * normScore) + (safeSpeedWeight * normSpeed)
                + (safeTraitWeight * learnerTrait)) / totalWeight;
        double safeClassBoost = clampFinite(classBoost, 0.0, -MAX_CLASS_BOOST, MAX_CLASS_BOOST);
        double finalIndex = clamp(weighted + safeClassBoost, 0.0, 1.0);

        Difficulty targetDiff = Difficulty.fromWeightedIndex(finalIndex);

        return new PersonalizationResult(
            normScore, normSpeed, learnerTrait, finalIndex, targetDiff, learningStyle
        );
    }

    private static double nonNegativeFinite(double value, double fallback) {
        return Double.isFinite(value) && value >= 0.0 ? value : fallback;
    }

    private static double clamp(double value, double min, double max) {
        return Math.min(max, Math.max(min, value));
    }

    private static double clampFinite(double value, double fallback, double min, double max) {
        return Double.isFinite(value) ? clamp(value, min, max) : fallback;
    }
}
