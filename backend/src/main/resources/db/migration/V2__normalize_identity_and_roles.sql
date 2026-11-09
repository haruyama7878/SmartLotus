CREATE TABLE user_roles (
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role user_role NOT NULL,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, role)
);

CREATE UNIQUE INDEX user_roles_one_primary_idx
    ON user_roles(user_id)
    WHERE is_primary = TRUE;

CREATE TABLE user_profiles (
    user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    first_name VARCHAR(80),
    last_name VARCHAR(80),
    phone VARCHAR(20),
    avatar_url TEXT,
    province VARCHAR(120),
    district VARCHAR(120),
    school VARCHAR(180),
    birth_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE student_profiles (
    user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    student_code VARCHAR(32) UNIQUE,
    grade VARCHAR(40),
    class_name VARCHAR(80),
    placement JSONB,
    lotus_points INTEGER NOT NULL DEFAULT 0 CHECK (lotus_points >= 0),
    current_streak INTEGER NOT NULL DEFAULT 0 CHECK (current_streak >= 0),
    longest_streak INTEGER NOT NULL DEFAULT 0 CHECK (longest_streak >= 0),
    last_active_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE teacher_profiles (
    user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    employee_code VARCHAR(32) UNIQUE,
    school VARCHAR(180),
    school_level VARCHAR(40),
    subject VARCHAR(80) NOT NULL DEFAULT 'Toán',
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE admin_profiles (
    user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    admin_level VARCHAR(32) NOT NULL DEFAULT 'operator',
    last_login_at TIMESTAMPTZ
);

INSERT INTO user_roles (user_id, role, is_primary)
SELECT id, role, TRUE FROM users
ON CONFLICT (user_id, role) DO NOTHING;

INSERT INTO user_profiles (user_id, first_name, last_name, phone, avatar_url, province, district, school, birth_date)
SELECT id, first_name, last_name, phone, avatar_url, province, district, school,
    CASE WHEN birth_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN birth_date::date ELSE NULL END
FROM users
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO student_profiles (user_id, grade, class_name, placement, lotus_points, current_streak, longest_streak, last_active_at)
SELECT id, grade, class_name, placement, lotus_points, current_streak, longest_streak, last_active_at
FROM users WHERE role = 'student'
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO teacher_profiles (user_id, school, school_level)
SELECT id, school, school_level FROM users WHERE role = 'teacher'
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO admin_profiles (user_id)
SELECT id FROM users WHERE role = 'admin'
ON CONFLICT (user_id) DO NOTHING;

CREATE OR REPLACE FUNCTION require_teacher_role()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = NEW.teacher_id AND role = 'teacher'
    ) THEN
        RAISE EXCEPTION 'User % must have teacher role', NEW.teacher_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER classrooms_require_teacher_role
    BEFORE INSERT OR UPDATE OF teacher_id ON classrooms
    FOR EACH ROW EXECUTE FUNCTION require_teacher_role();

CREATE TRIGGER assignment_projects_require_teacher_role
    BEFORE INSERT OR UPDATE OF teacher_id ON assignment_projects
    FOR EACH ROW EXECUTE FUNCTION require_teacher_role();

CREATE INDEX user_roles_role_idx ON user_roles(role);
CREATE INDEX student_profiles_class_idx ON student_profiles(class_name);
CREATE INDEX teacher_profiles_school_idx ON teacher_profiles(school);
