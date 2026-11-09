-- Development-only demo identities. Do not use these accounts in production.
INSERT INTO users (auth_user_id, email, display_name, role, avatar)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'admin.demo@smartlotus.local', 'Quản trị viên demo', 'admin', 'QT'),
  ('00000000-0000-0000-0000-000000000002', 'teacher.demo@smartlotus.local', 'Cô Nguyễn Thủy', 'teacher', 'NT'),
  ('00000000-0000-0000-0000-000000000003', 'student.demo@smartlotus.local', 'Nguyễn Minh Anh', 'student', 'MA')
ON CONFLICT (email) DO UPDATE SET display_name = EXCLUDED.display_name, role = EXCLUDED.role, avatar = EXCLUDED.avatar;

INSERT INTO user_roles (user_id, role, is_primary)
SELECT id, role, TRUE FROM users
WHERE email IN ('admin.demo@smartlotus.local', 'teacher.demo@smartlotus.local', 'student.demo@smartlotus.local')
ON CONFLICT (user_id, role) DO UPDATE SET is_primary = TRUE;

INSERT INTO user_profiles (user_id, first_name, last_name, school)
SELECT id, CASE role WHEN 'student' THEN 'Minh Anh' ELSE split_part(display_name, ' ', 2) END,
       CASE role WHEN 'student' THEN 'Nguyễn' ELSE 'Demo' END,
       'Smart Lotus Demo School'
FROM users
WHERE email IN ('admin.demo@smartlotus.local', 'teacher.demo@smartlotus.local', 'student.demo@smartlotus.local')
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO teacher_profiles (user_id, employee_code, school, subject)
SELECT id, 'GV-DEMO-001', 'Smart Lotus Demo School', 'Toán'
FROM users WHERE email = 'teacher.demo@smartlotus.local'
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO student_profiles (user_id, student_code, grade, class_name)
SELECT id, 'SL-STU-000001', 'Lớp 1', '1A'
FROM users WHERE email = 'student.demo@smartlotus.local'
ON CONFLICT (user_id) DO UPDATE SET student_code = EXCLUDED.student_code;

INSERT INTO admin_profiles (user_id, admin_level)
SELECT id, 'super_admin' FROM users WHERE email = 'admin.demo@smartlotus.local'
ON CONFLICT (user_id) DO NOTHING;
