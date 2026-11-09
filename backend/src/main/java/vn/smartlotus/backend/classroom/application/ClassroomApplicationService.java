package vn.smartlotus.backend.classroom.application;

import java.security.SecureRandom;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import vn.smartlotus.backend.classroom.domain.ClassroomEntity;
import vn.smartlotus.backend.classroom.infrastructure.ClassroomRepository;
import vn.smartlotus.backend.identity.application.UserApplicationService;
import vn.smartlotus.backend.identity.domain.UserEntity;
import vn.smartlotus.backend.identity.domain.UserRole;
import vn.smartlotus.backend.shared.api.ForbiddenOperationException;
import vn.smartlotus.backend.shared.api.ResourceNotFoundException;

@Service
public class ClassroomApplicationService {
    private final ClassroomRepository classrooms;
    private final UserApplicationService users;
    private final SecureRandom random = new SecureRandom();

    public ClassroomApplicationService(ClassroomRepository classrooms, UserApplicationService users) {
        this.classrooms = classrooms; this.users = users;
    }

    @Transactional(readOnly = true)
    public List<ClassroomEntity> listMine() { return classrooms.findByTeacherOrderByCreatedAtAsc(users.requireCurrentUser()); }

    @Transactional
    public ClassroomEntity create(CreateClassroomCommand command) {
        UserEntity teacher = users.requireCurrentUser();
        if (teacher.getRole() == UserRole.student) throw new ForbiddenOperationException("Chỉ giáo viên mới được tạo lớp học");
        String code;
        do {
            code = String.format("%08X", random.nextInt());
        } while (classrooms.existsByJoinCode(code));
        return classrooms.save(new ClassroomEntity(teacher, command.name().trim(), command.label().trim().toUpperCase(),
            command.subject().trim(), normalizeDescription(command.description()), command.color(), code));
    }

    public record CreateClassroomCommand(String name, String label, String subject, String description, String color) {}

    @Transactional
    public ClassroomEntity update(long classroomId, CreateClassroomCommand command) {
        UserEntity teacher = users.requireCurrentUser();
        ClassroomEntity classroom = classrooms.findById(classroomId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy lớp học"));
        if (!classroom.getTeacher().getId().equals(teacher.getId())) {
            throw new ForbiddenOperationException("Bạn không sở hữu lớp học này");
        }
        classroom.update(command.name().trim(), command.label().trim().toUpperCase(), command.subject().trim(),
                normalizeDescription(command.description()), command.color());
        return classrooms.save(classroom);
    }

    private String normalizeDescription(String description) {
        return description == null ? "" : description.trim();
    }

    @Transactional
    public void delete(long classroomId) {
        UserEntity teacher = users.requireCurrentUser();
        ClassroomEntity classroom = classrooms.findById(classroomId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy lớp học"));
        if (!classroom.getTeacher().getId().equals(teacher.getId())) {
            throw new ForbiddenOperationException("Bạn không sở hữu lớp học này");
        }
        classrooms.delete(classroom);
    }
}
