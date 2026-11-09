-- seed.sql: dữ liệu mẫu cho lược đồ quiz / lớp học
-- Chạy SAU khi đã tạo toàn bộ bảng, trigger và index.
-- Có thể chạy lại nhiều lần (ON CONFLICT DO NOTHING), trừ phần audit_log sẽ thêm dòng mới.

BEGIN;

-- 1. USERS (1 admin, 2 giáo viên, 6 học sinh) ---------------------------
INSERT INTO users (id, email, display_name, role, avatar, first_name, last_name, phone,
                   province, district, school, school_level, grade, class_name, birth_date,
                   placement, lotus_points, current_streak, longest_streak, last_active_at, created_at)
VALUES
 (1, 'admin@lotus.edu.vn',  'Quản trị viên',   'admin',   'AD', 'Quản', 'Trị',  '0900000001',
     'Hà Nội', 'Ba Đình', NULL, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, now(), now() - interval '90 days'),
 (2, 'co.lan@lotus.edu.vn', 'Cô Nguyễn Thị Lan', 'teacher', 'NL', 'Lan',  'Nguyễn', '0900000002',
     'Hà Nội', 'Ba Vì', 'THCS Ba Vì', 'THCS', NULL, NULL, '1985-03-12', NULL, 0, 0, 0, now(), now() - interval '80 days'),
 (3, 'thay.nam@lotus.edu.vn', 'Thầy Trần Văn Nam', 'teacher', 'TN', 'Nam', 'Trần', '0900000003',
     'Hà Nội', 'Sơn Tây', 'THCS Sơn Tây', 'THCS', NULL, NULL, '1982-07-25', NULL, 0, 0, 0, now(), now() - interval '75 days'),
 (4, 'an@lotus.edu.vn',    'Lê Minh An',     'student', 'MA', 'An',   'Lê',    '0910000004',
     'Hà Nội', 'Ba Vì', 'THCS Ba Vì', 'THCS', 'Lớp 6', '6A1', '2014-05-02',
     '{"level": 3, "score": 72}'::jsonb, 320, 5, 12, now() - interval '1 hour', now() - interval '60 days'),
 (5, 'binh@lotus.edu.vn',  'Phạm Gia Bình',  'student', 'GB', 'Bình', 'Phạm',  '0910000005',
     'Hà Nội', 'Ba Vì', 'THCS Ba Vì', 'THCS', 'Lớp 6', '6A1', '2014-09-18',
     '{"level": 2, "score": 55}'::jsonb, 210, 3, 8, now() - interval '3 hours', now() - interval '58 days'),
 (6, 'chi@lotus.edu.vn',   'Hoàng Linh Chi', 'student', 'LC', 'Chi',  'Hoàng', '0910000006',
     'Hà Nội', 'Ba Vì', 'THCS Ba Vì', 'THCS', 'Lớp 6', '6A2', '2014-01-30',
     '{"level": 4, "score": 88}'::jsonb, 540, 9, 20, now() - interval '30 minutes', now() - interval '57 days'),
 (7, 'dung@lotus.edu.vn',  'Vũ Tiến Dũng',   'student', 'TD', 'Dũng', 'Vũ',    '0910000007',
     'Hà Nội', 'Ba Vì', 'THCS Ba Vì', 'THCS', 'Lớp 6', '6A2', '2014-11-11',
     '{"level": 1, "score": 40}'::jsonb, 95, 0, 4, now() - interval '5 days', now() - interval '55 days'),
 (8, 'giang@lotus.edu.vn', 'Đỗ Hương Giang', 'student', 'HG', 'Giang','Đỗ',    '0910000008',
     'Hà Nội', 'Sơn Tây', 'THCS Sơn Tây', 'THCS', 'Lớp 7', '7B1', '2013-04-08',
     '{"level": 3, "score": 68}'::jsonb, 400, 7, 15, now() - interval '2 hours', now() - interval '50 days'),
 (9, 'hung@lotus.edu.vn',  'Ngô Quốc Hùng',  'student', 'QH', 'Hùng', 'Ngô',   '0910000009',
     'Hà Nội', 'Sơn Tây', 'THCS Sơn Tây', 'THCS', 'Lớp 7', '7B1', '2013-12-21',
     '{"level": 2, "score": 60}'::jsonb, 150, 1, 6, now() - interval '1 day', now() - interval '48 days')
ON CONFLICT (id) DO NOTHING;

-- 2. Bảng phụ suy ra từ users (giống đoạn migration) --------------------
INSERT INTO user_roles (user_id, role, is_primary)
SELECT id, role, TRUE FROM users
ON CONFLICT (user_id, role) DO NOTHING;

INSERT INTO user_profiles (user_id, first_name, last_name, phone, avatar_url, province, district, school, birth_date)
SELECT id, first_name, last_name, phone, avatar_url, province, district, school,
       CASE WHEN birth_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN birth_date::date ELSE NULL END
FROM users
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO student_profiles (user_id, student_code, grade, class_name, placement,
                              lotus_points, current_streak, longest_streak, last_active_at)
SELECT id, 'HS' || lpad(id::text, 5, '0'), grade, class_name, placement,
       lotus_points, current_streak, longest_streak, last_active_at
FROM users WHERE role = 'student'
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO teacher_profiles (user_id, employee_code, school, school_level, verified_at)
SELECT id, 'GV' || lpad(id::text, 5, '0'), school, school_level, now() - interval '70 days'
FROM users WHERE role = 'teacher'
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO admin_profiles (user_id, last_login_at)
SELECT id, now() - interval '2 hours' FROM users WHERE role = 'admin'
ON CONFLICT (user_id) DO NOTHING;

-- 3. LESSONS ------------------------------------------------------------
INSERT INTO lessons (id, slug, curriculum_level, title, topic, competency, question_count, published) VALUES
 (1, 'so-nguyen-co-ban',   1, 'Số nguyên cơ bản',        'Số học',   'Thực hiện phép tính với số nguyên',          10, TRUE),
 (2, 'phan-so',            2, 'Phân số và số thập phân', 'Số học',   'So sánh và tính toán với phân số',           10, TRUE),
 (3, 'hinh-hoc-co-ban',    3, 'Hình học cơ bản',         'Hình học', 'Nhận biết điểm, đường thẳng, góc',           10, TRUE),
 (4, 'ti-le-phan-tram',    4, 'Tỉ lệ và phần trăm',      'Đại số',   'Giải bài toán tỉ lệ và phần trăm',           10, TRUE),
 (5, 'phuong-trinh-bac-1', 5, 'Phương trình bậc nhất',   'Đại số',   'Giải phương trình bậc nhất một ẩn',          10, FALSE)
ON CONFLICT (id) DO NOTHING;

-- 4. QUIZ_ATTEMPTS ------------------------------------------------------
-- answers được sinh tự động: n câu đúng đầu tiên là true.
INSERT INTO quiz_attempts (user_id, lesson_id, lesson_slug, correct_answers, total_questions,
                           score, duration_seconds, highest_difficulty, answers, completed_at)
SELECT v.user_id, v.lesson_id, v.slug, v.correct, 10, v.correct * 10, v.dur, v.diff::difficulty,
       (SELECT jsonb_agg(jsonb_build_object('question', g, 'correct', g <= v.correct) ORDER BY g)
        FROM generate_series(1, 10) AS g),
       now() - v.ago
FROM (VALUES
 (4, 1, 'so-nguyen-co-ban',   9, 420, 'C', interval '10 days'),
 (4, 2, 'phan-so',            8, 510, 'C', interval '6 days'),
 (4, 3, 'hinh-hoc-co-ban',    7, 600, 'B', interval '2 days'),
 (5, 1, 'so-nguyen-co-ban',   6, 480, 'B', interval '9 days'),
 (5, 2, 'phan-so',            5, 560, 'B', interval '4 days'),
 (6, 1, 'so-nguyen-co-ban',  10, 300, 'E', interval '12 days'),
 (6, 2, 'phan-so',           10, 330, 'E', interval '8 days'),
 (6, 4, 'ti-le-phan-tram',    9, 450, 'D', interval '1 day'),
 (7, 1, 'so-nguyen-co-ban',   4, 700, 'A', interval '7 days'),
 (8, 3, 'hinh-hoc-co-ban',    8, 520, 'C', interval '5 days'),
 (8, 4, 'ti-le-phan-tram',    7, 580, 'C', interval '1 day'),
 (9, 1, 'so-nguyen-co-ban',   6, 540, 'B', interval '3 days')
) AS v(user_id, lesson_id, slug, correct, dur, diff, ago);

-- 5. DAILY_ACTIVITY (7 ngày gần nhất cho vài học sinh) -------------------
INSERT INTO daily_activity (user_id, activity_date, minutes_learned, lessons_completed, points_earned)
SELECT u.id,
       to_char(current_date - d, 'YYYY-MM-DD'),
       10 + ((u.id * 7 + d * 13) % 40),
       1 + ((u.id + d) % 3),
       20 + ((u.id * 11 + d * 17) % 60)
FROM (VALUES (4), (5), (6), (8)) AS u(id)
CROSS JOIN generate_series(0, 6) AS d
ON CONFLICT (user_id, activity_date) DO NOTHING;

-- 6. CLASSROOMS (teacher_id phải có role 'teacher' trong user_roles) -----
INSERT INTO classrooms (id, teacher_id, name, label, subject, description, color, join_code, created_at) VALUES
 (1, 2, 'Toán 6A1', '6A1', 'Toán', 'Lớp Toán 6A1, học kỳ 1', 'purple', 'TOAN6A1', now() - interval '45 days'),
 (2, 2, 'Toán 6A2', '6A2', 'Toán', 'Lớp Toán 6A2, học kỳ 1', 'teal',   'TOAN6A2', now() - interval '44 days'),
 (3, 3, 'Toán 7B1', '7B1', 'Toán', 'Lớp Toán 7B1, học kỳ 1', 'coral',  'TOAN7B1', now() - interval '40 days')
ON CONFLICT (id) DO NOTHING;

-- 7. CLASSROOM_MEMBERSHIPS ---------------------------------------------
INSERT INTO classroom_memberships (classroom_id, student_id, joined_at) VALUES
 (1, 4, now() - interval '40 days'),
 (1, 5, now() - interval '39 days'),
 (2, 6, now() - interval '38 days'),
 (2, 7, now() - interval '37 days'),
 (3, 8, now() - interval '30 days'),
 (3, 9, now() - interval '29 days')
ON CONFLICT (classroom_id, student_id) DO NOTHING;

-- 8. CLASSROOM_INVITATIONS ---------------------------------------------
INSERT INTO classroom_invitations (classroom_id, student_id, status, created_at, responded_at) VALUES
 (1, 4, 'accepted', now() - interval '41 days', now() - interval '40 days'),
 (1, 5, 'accepted', now() - interval '41 days', now() - interval '39 days'),
 (1, 6, 'declined', now() - interval '20 days', now() - interval '19 days'),
 (2, 6, 'accepted', now() - interval '39 days', now() - interval '38 days'),
 (2, 7, 'accepted', now() - interval '39 days', now() - interval '37 days'),
 (3, 8, 'accepted', now() - interval '31 days', now() - interval '30 days'),
 (3, 9, 'accepted', now() - interval '31 days', now() - interval '29 days'),
 (3, 4, 'pending',  now() - interval '2 days',  NULL)
ON CONFLICT (classroom_id, student_id) DO NOTHING;

-- 9. CLASSROOM_ASSIGNMENTS ---------------------------------------------
INSERT INTO classroom_assignments (id, classroom_id, title, topic, curriculum_level, due_at,
                                   duration_minutes, questions, created_at) VALUES
 (1, 1, 'Kiểm tra số nguyên', 'Số học', 1, now() - interval '5 days', 15,
    '[{"id":1,"text":"Tính (-5) + 8","options":["3","-3","13","-13"],"correctAnswer":"3"},
        {"id":2,"text":"Tính 7 - (-2)","options":["5","9","-9","-5"],"correctAnswer":"9"},
        {"id":3,"text":"Tính (-4) x 3","options":["12","-12","7","-7"],"correctAnswer":"-12"}]'::jsonb,
  now() - interval '12 days'),
 (2, 2, 'Bài tập phân số', 'Số học', 2, now() + interval '3 days', 20,
    '[{"id":1,"text":"Rút gọn 6/8","options":["3/4","2/3","1/2","4/5"],"correctAnswer":"3/4"},
        {"id":2,"text":"Tính 1/2 + 1/3","options":["5/6","2/5","1/6","2/3"],"correctAnswer":"5/6"},
        {"id":3,"text":"So sánh 2/3 và 3/4","options":["2/3 < 3/4","2/3 > 3/4","bằng nhau","không so sánh được"],"correctAnswer":"2/3 < 3/4"}]'::jsonb,
  now() - interval '4 days'),
 (3, 3, 'Góc và đường thẳng', 'Hình học', 3, now() + interval '7 days', 25,
    '[{"id":1,"text":"Góc vuông bằng bao nhiêu độ?","options":["45","90","180","360"],"correctAnswer":"90"},
        {"id":2,"text":"Tổng ba góc trong tam giác?","options":["90","180","270","360"],"correctAnswer":"180"},
        {"id":3,"text":"Hai đường thẳng vuông góc tạo góc?","options":["30","60","90","120"],"correctAnswer":"90"}]'::jsonb,
  now() - interval '2 days')
ON CONFLICT (id) DO NOTHING;

-- 10. ASSIGNMENT_SUBMISSIONS (chỉ học sinh thuộc lớp của bài tập) -------
INSERT INTO assignment_submissions (assignment_id, student_id, score, correct_answers, total_questions,
                                    duration_seconds, answers, submitted_at) VALUES
    (1, 4, 100, 3, 3, 540, '[{"questionId":1,"answer":"3"},{"questionId":2,"answer":"9"},{"questionId":3,"answer":"-12"}]'::jsonb,  now() - interval '6 days'),
    (1, 5,  67, 2, 3, 780, '[{"questionId":1,"answer":"3"},{"questionId":2,"answer":"5"},{"questionId":3,"answer":"-12"}]'::jsonb,  now() - interval '5 days 2 hours'),
    (2, 6, 100, 3, 3, 600, '[{"questionId":1,"answer":"3/4"},{"questionId":2,"answer":"5/6"},{"questionId":3,"answer":"2/3 < 3/4"}]'::jsonb, now() - interval '1 day'),
    (3, 8,  67, 2, 3, 900, '[{"questionId":1,"answer":"90"},{"questionId":2,"answer":"180"},{"questionId":3,"answer":"60"}]'::jsonb, now() - interval '12 hours')
ON CONFLICT (assignment_id, student_id) DO NOTHING;

-- 11. ASSIGNMENT_PROJECTS (bản nháp của giáo viên) ----------------------
INSERT INTO assignment_projects (id, teacher_id, name, topic, curriculum_level, questions, created_at, updated_at) VALUES
 (1, 2, 'Mẫu: Số nguyên', 'Số học', 1,
    '[{"id":1,"text":"Tính (-2) + (-3)","options":["-5","5","1","-1"],"correctAnswer":"-5"}]'::jsonb,
  now() - interval '20 days', now() - interval '3 days'),
 (2, 2, 'Mẫu: Phân số',  'Số học', 2,
    '[{"id":1,"text":"Tính 3/5 - 1/5","options":["2/5","4/5","2/10","1/5"],"correctAnswer":"2/5"}]'::jsonb,
  now() - interval '15 days', now() - interval '1 day'),
 (3, 3, 'Mẫu: Hình học', 'Hình học', 3,
    '[{"id":1,"text":"Số đo góc bẹt?","options":["90","180","270","360"],"correctAnswer":"180"}]'::jsonb,
  now() - interval '10 days', now() - interval '2 days')
ON CONFLICT (id) DO NOTHING;

-- 12. AUDIT_LOG ---------------------------------------------------------
INSERT INTO audit_log (actor_user_id, action, resource_type, resource_id, metadata, ip_address, user_agent, created_at) VALUES
 (1, 'user.login',          'user',       '1', '{"method":"password"}',                '203.0.113.10', 'Mozilla/5.0 (Windows NT 10.0)', now() - interval '2 hours'),
 (2, 'classroom.create',    'classroom',  '1', '{"label":"6A1"}',                      '203.0.113.21', 'Mozilla/5.0 (Macintosh)',       now() - interval '45 days'),
 (2, 'assignment.create',   'assignment', '1', '{"classroom_id":1}',                   '203.0.113.21', 'Mozilla/5.0 (Macintosh)',       now() - interval '12 days'),
 (4, 'submission.create',   'submission', '1', '{"assignment_id":1,"score":100}',      '198.51.100.7', 'Mozilla/5.0 (iPhone)',          now() - interval '6 days'),
 (3, 'invitation.send',     'invitation', '8', '{"classroom_id":3,"student_id":4}',    '203.0.113.35', 'Mozilla/5.0 (Windows NT 10.0)', now() - interval '2 days'),
 (NULL, 'system.cleanup',   'system',     NULL, '{"removed_sessions":42}',             NULL,           NULL,                            now() - interval '1 day');

-- 13. Đồng bộ lại sequence sau khi chèn id thủ công ---------------------
SELECT setval(pg_get_serial_sequence('users', 'id'),                  (SELECT max(id) FROM users));
SELECT setval(pg_get_serial_sequence('lessons', 'id'),                (SELECT max(id) FROM lessons));
SELECT setval(pg_get_serial_sequence('classrooms', 'id'),             (SELECT max(id) FROM classrooms));
SELECT setval(pg_get_serial_sequence('classroom_assignments', 'id'),  (SELECT max(id) FROM classroom_assignments));
SELECT setval(pg_get_serial_sequence('assignment_projects', 'id'),    (SELECT max(id) FROM assignment_projects));

COMMIT;
