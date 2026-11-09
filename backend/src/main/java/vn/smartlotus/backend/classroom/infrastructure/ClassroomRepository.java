package vn.smartlotus.backend.classroom.infrastructure;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import vn.smartlotus.backend.classroom.domain.ClassroomEntity;
import vn.smartlotus.backend.identity.domain.UserEntity;

public interface ClassroomRepository extends JpaRepository<ClassroomEntity, Long> {
    List<ClassroomEntity> findByTeacherOrderByCreatedAtAsc(UserEntity teacher);
    boolean existsByJoinCode(String joinCode);
}
