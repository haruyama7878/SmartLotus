CREATE OR REPLACE FUNCTION require_student_role()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM users
        WHERE id = NEW.student_id AND role = 'student'
    ) THEN
        RAISE EXCEPTION 'User % must have student role', NEW.student_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER classroom_memberships_require_student_role
    BEFORE INSERT OR UPDATE OF student_id ON classroom_memberships
    FOR EACH ROW EXECUTE FUNCTION require_student_role();

CREATE TRIGGER classroom_invitations_require_student_role
    BEFORE INSERT OR UPDATE OF student_id ON classroom_invitations
    FOR EACH ROW EXECUTE FUNCTION require_student_role();

CREATE TRIGGER assignment_submissions_require_student_role
    BEFORE INSERT OR UPDATE OF student_id ON assignment_submissions
    FOR EACH ROW EXECUTE FUNCTION require_student_role();
