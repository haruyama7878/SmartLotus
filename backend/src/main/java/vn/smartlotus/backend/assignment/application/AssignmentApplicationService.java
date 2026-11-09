package vn.smartlotus.backend.assignment.application;

import java.time.Instant;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import vn.smartlotus.backend.assignment.domain.AssignmentEntity;
import vn.smartlotus.backend.assignment.infrastructure.AssignmentRepository;
import vn.smartlotus.backend.classroom.domain.ClassroomEntity;
import vn.smartlotus.backend.classroom.infrastructure.ClassroomRepository;
import vn.smartlotus.backend.identity.application.UserApplicationService;
import vn.smartlotus.backend.identity.domain.UserEntity;
import vn.smartlotus.backend.identity.domain.UserRole;
import vn.smartlotus.backend.shared.api.ForbiddenOperationException;
import vn.smartlotus.backend.shared.api.ResourceNotFoundException;

@Service
public class AssignmentApplicationService {
    private final AssignmentRepository assignments;
    private final ClassroomRepository classrooms;
    private final UserApplicationService users;

    public AssignmentApplicationService(AssignmentRepository assignments, ClassroomRepository classrooms, UserApplicationService users) {
        this.assignments = assignments; this.classrooms = classrooms; this.users = users;
    }

    @Transactional(readOnly = true)
    public List<AssignmentEntity> listMine() {
        UserEntity user = users.requireCurrentUser();
        return assignments.findByClassroomTeacherOrderByDueAtAsc(user);
    }

    @Transactional
    public AssignmentEntity create(CreateAssignmentCommand command) {
        UserEntity teacher = users.requireCurrentUser();
        if (teacher.getRole() == UserRole.student) throw new ForbiddenOperationException("Chỉ giáo viên mới được giao bài tập");
        ClassroomEntity classroom = classrooms.findById(command.classroomId()).orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy lớp học"));
        if (!classroom.getTeacher().getId().equals(teacher.getId())) throw new ForbiddenOperationException("Bạn không sở hữu lớp học này");
        return assignments.save(new AssignmentEntity(classroom, command.title().trim(), command.topic().trim(), command.curriculumLevel(),
            command.dueAt(), command.durationMinutes(), command.questions()));
    }

    public record CreateAssignmentCommand(long classroomId, String title, String topic, int curriculumLevel,
                                          Instant dueAt, int durationMinutes, String questions) {}
}
