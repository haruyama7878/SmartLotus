package vn.smartlotus.backend.learning.domain;

/**
 * Kết quả đầu ra của bộ cá nhân hóa (trái tim hệ thống SmartLotus).
 * Chứa các chỉ số đã chuẩn hóa, điểm trọng số tổng hợp và mức độ khó mục tiêu
 * (A: dễ nhất -> E: giỏi/mũi nhọn) cùng phong cách học của học sinh.
 */
public record PersonalizationResult(
        double normalizedScore,
        double normalizedSpeed,
        double learnerTraitIndex,
        double finalWeightedScore,
        Difficulty targetDifficulty,
        String studentLearningStyle
) {
}
