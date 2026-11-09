CREATE INDEX quiz_attempts_user_completed_idx
    ON quiz_attempts(user_id, completed_at DESC);

CREATE INDEX daily_activity_user_date_desc_idx
    ON daily_activity(user_id, activity_date DESC);

CREATE INDEX classrooms_teacher_created_idx
    ON classrooms(teacher_id, created_at DESC);

CREATE INDEX classroom_memberships_student_joined_idx
    ON classroom_memberships(student_id, joined_at DESC);

CREATE INDEX classroom_invitations_student_status_idx
    ON classroom_invitations(student_id, status, created_at DESC);

CREATE INDEX classroom_assignments_class_due_idx
    ON classroom_assignments(classroom_id, due_at ASC);

CREATE INDEX assignment_projects_teacher_updated_idx
    ON assignment_projects(teacher_id, updated_at DESC);

CREATE INDEX assignment_submissions_student_submitted_idx
    ON assignment_submissions(student_id, submitted_at DESC);

CREATE TABLE audit_log (
    id BIGSERIAL PRIMARY KEY,
    actor_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(80) NOT NULL,
    resource_type VARCHAR(80) NOT NULL,
    resource_id VARCHAR(80),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX audit_log_actor_created_idx
    ON audit_log(actor_user_id, created_at DESC);

CREATE INDEX audit_log_resource_created_idx
    ON audit_log(resource_type, resource_id, created_at DESC);

CREATE INDEX audit_log_created_brin_idx
    ON audit_log USING BRIN(created_at);
