-- 1. Bảng Trọng số cá nhân hóa (Cho phép Giáo viên can thiệp theo từng lớp)
CREATE TABLE personalization_configs (
    id BIGSERIAL PRIMARY KEY,
    classroom_id BIGINT UNIQUE REFERENCES classrooms(id) ON DELETE CASCADE,
    teacher_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    w_score DOUBLE PRECISION NOT NULL DEFAULT 0.50,  -- Trọng số điểm số
    w_speed DOUBLE PRECISION NOT NULL DEFAULT 0.30,  -- Trọng số tốc độ (duration_seconds)
    w_trait DOUBLE PRECISION NOT NULL DEFAULT 0.20,  -- Trọng số đặc điểm học sinh (placement + streak)
    class_boost DOUBLE PRECISION NOT NULL DEFAULT 0.0, -- Đẩy trọng số từng lớp (VD: Lớp Giỏi +0.25 để vào mức D, E)
    teacher_style_prompt TEXT NOT NULL DEFAULT 'Vui vẻ, lấy ví dụ trực quan gần gũi với học sinh lớp 1',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Nạp Dataset Toán lớp 1 (Chuẩn Tiểu học FPT: Cơ bản -> Tư duy STEM/Logic) vào bảng lessons sẵn có
INSERT INTO lessons (slug, curriculum_level, title, topic, competency, question_count, published)
VALUES
('fpt-toan1-tach-gop-10', 1, 'Tách - Gộp số trong phạm vi 10', 'Số học cơ bản',
 'Chuẩn Toán 1 FPT: Học sinh hiểu bản chất cấu tạo số qua thao tác tách/gộp vật thật (khối Lego, que tính). Mức A-B: Tách 2 nhóm có hình minh họa. Mức C: Điền số còn thiếu vào sơ đồ tách gộp. Mức D-E (Giỏi): Bài toán đố chia kẹo vào nhiều hộp thỏa mãn điều kiện.', 10, TRUE),

('fpt-toan1-cong-tru-qua-10', 2, 'Phép cộng, phép trừ trong phạm vi 20', 'Phép tính',
 'Chuẩn Toán 1 FPT: Áp dụng phương pháp làm tròn chục (tách số để gộp đủ 10). Mức A-B: Phép tính trực tiếp không nhớ. Mức C: Phép tính nối tiếp 2 bước (VD: 8 + 2 + 5). Mức D-E (Giỏi): Tìm số ẩn trong cân thăng bằng hoặc tháp số tư duy.', 10, TRUE),

('fpt-toan1-quy-luat-hinh-so', 3, 'Nhận diện hình phẳng & Quy luật tư duy', 'Hình học & Logic',
 'Chuẩn Toán 1 FPT (STEM): Nhận biết hình vuông, tròn, tam giác, khối lập phương và tìm quy luật lặp lại. Mức A-B: Đếm hình đơn giản. Mức C: Tìm hình tiếp theo trong dãy quy luật. Mức D-E (Giỏi): Đếm hình chồng nhau và suy luận logic loại trừ.', 10, TRUE),

('fpt-toan1-toan-co-loi-van', 4, 'Giải bài toán thực tế có lời văn', 'Giải quyết vấn đề',
 'Chuẩn Toán 1 FPT: Đọc hiểu từ khóa thực tế (thêm vào, bay đi, nhiều hơn, ít hơn, tất cả). Mức A-B: Tóm tắt sẵn, chỉ chọn phép tính. Mức C: Bài toán có lời văn 1 bước tính. Mức D-E (Giỏi): Bài toán thực tế có dữ kiện gây nhiễu hoặc suy luận ngược.', 10, TRUE)
ON CONFLICT (slug) DO NOTHING;
