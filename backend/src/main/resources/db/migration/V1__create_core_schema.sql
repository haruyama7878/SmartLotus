CREATE TYPE user_role AS ENUM ('student', 'teacher', 'admin');
CREATE TYPE difficulty AS ENUM ('A', 'B', 'C', 'D', 'E');

CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    auth_user_id UUID UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    display_name VARCHAR(120) NOT NULL,
    role user_role NOT NULL DEFAULT 'student',
    avatar VARCHAR(12) NOT NULL DEFAULT 'MA',
    first_name VARCHAR(80), last_name VARCHAR(80), phone VARCHAR(20),
    province VARCHAR(120), district VARCHAR(120), school VARCHAR(180),
    school_level VARCHAR(40), grade VARCHAR(40), class_name VARCHAR(80), birth_date VARCHAR(20),
    avatar_url TEXT, placement JSONB,
    lotus_points INTEGER NOT NULL DEFAULT 0,
    current_streak INTEGER NOT NULL DEFAULT 0,
    longest_streak INTEGER NOT NULL DEFAULT 0,
    last_active_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE lessons (
    id BIGSERIAL PRIMARY KEY,
    slug VARCHAR(120) NOT NULL UNIQUE,
    curriculum_level INTEGER NOT NULL,
    title VARCHAR(180) NOT NULL,
    topic VARCHAR(180) NOT NULL,
    competency TEXT NOT NULL,
    question_count INTEGER NOT NULL DEFAULT 10,
    published BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE quiz_attempts (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lesson_id BIGINT REFERENCES lessons(id) ON DELETE SET NULL,
    lesson_slug VARCHAR(120) NOT NULL,
    correct_answers INTEGER NOT NULL,
    total_questions INTEGER NOT NULL DEFAULT 10,
    score INTEGER NOT NULL,
    duration_seconds INTEGER NOT NULL,
    highest_difficulty difficulty NOT NULL,
    answers JSONB NOT NULL,
    completed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX quiz_attempts_lesson_id_idx ON quiz_attempts(lesson_id);

CREATE TABLE daily_activity (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    activity_date VARCHAR(10) NOT NULL,
    minutes_learned INTEGER NOT NULL DEFAULT 0,
    lessons_completed INTEGER NOT NULL DEFAULT 0,
    points_earned INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT daily_activity_user_date_unique UNIQUE (user_id, activity_date)
);

CREATE TABLE classrooms (
    id BIGSERIAL PRIMARY KEY,
    teacher_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(120) NOT NULL,
    label VARCHAR(40) NOT NULL,
    subject VARCHAR(80) NOT NULL DEFAULT 'Toán',
    description VARCHAR(500) NOT NULL DEFAULT '',
    color VARCHAR(20) NOT NULL DEFAULT 'purple',
    join_code VARCHAR(12) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT classrooms_teacher_label_unique UNIQUE (teacher_id, label)
);

CREATE TABLE classroom_memberships (
    id BIGSERIAL PRIMARY KEY,
    classroom_id BIGINT NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
    student_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT classroom_memberships_unique UNIQUE (classroom_id, student_id)
);

CREATE TABLE classroom_invitations (
    id BIGSERIAL PRIMARY KEY,
    classroom_id BIGINT NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
    student_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(12) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    responded_at TIMESTAMPTZ,
    CONSTRAINT classroom_invitations_unique UNIQUE (classroom_id, student_id)
);

CREATE TABLE classroom_assignments (
    id BIGSERIAL PRIMARY KEY,
    classroom_id BIGINT NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
    title VARCHAR(180) NOT NULL,
    topic VARCHAR(180) NOT NULL,
    curriculum_level INTEGER NOT NULL,
    due_at TIMESTAMPTZ NOT NULL,
    duration_minutes INTEGER NOT NULL,
    questions JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE assignment_projects (
    id BIGSERIAL PRIMARY KEY,
    teacher_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(180) NOT NULL,
    topic VARCHAR(180) NOT NULL,
    curriculum_level INTEGER NOT NULL,
    questions JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX assignment_projects_teacher_name_idx ON assignment_projects(teacher_id, name);

CREATE TABLE assignment_submissions (
    id BIGSERIAL PRIMARY KEY,
    assignment_id BIGINT NOT NULL REFERENCES classroom_assignments(id) ON DELETE CASCADE,
    student_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    score INTEGER NOT NULL,
    correct_answers INTEGER NOT NULL,
    total_questions INTEGER NOT NULL,
    duration_seconds INTEGER NOT NULL,
    answers JSONB NOT NULL,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT assignment_submissions_unique UNIQUE (assignment_id, student_id)
);
