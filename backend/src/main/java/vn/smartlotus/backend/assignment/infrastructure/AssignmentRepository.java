package vn.smartlotus.backend.assignment.infrastructure;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import vn.smartlotus.backend.assignment.domain.AssignmentEntity;
import vn.smartlotus.backend.classroom.domain.ClassroomEntity;

public interface AssignmentRepository extends JpaRepository<AssignmentEntity, Long> {
    List<AssignmentEntity> findByClassroomTeacherOrderByDueAtAsc(vn.smartlotus.backend.identity.domain.UserEntity teacher);
    List<AssignmentEntity> findByClassroomOrderByDueAtAsc(ClassroomEntity classroom);
}
