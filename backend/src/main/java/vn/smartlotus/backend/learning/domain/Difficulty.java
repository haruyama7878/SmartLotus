package vn.smartlotus.backend.learning.domain;

/**
 * Mức độ khó mục tiêu của câu hỏi được cá nhân hóa.
 * A: dễ nhất -> E: giỏi/mũi nhọn.
 */
public enum Difficulty {
    A, B, C, D, E;

    /**
     * Ánh xạ chỉ số trọng số tổng hợp [0.0, 1.0] sang 5 mức độ A..E.
     * 0.0-0.2 -> A, 0.2-0.4 -> B, 0.4-0.6 -> C, 0.6-0.8 -> D, 0.8-1.0 -> E.
     */
    public static Difficulty fromWeightedIndex(double index) {
        double clamped = Math.min(1.0, Math.max(0.0, index));
        int ordinal = (int) Math.floor(clamped * 5.0);
        if (ordinal > 4) {
            ordinal = 4;
        }
        return values()[ordinal];
    }
}
