package vn.smartlotus.backend.learning.infrastructure;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import vn.smartlotus.backend.learning.domain.LessonEntity;

public interface LessonRepository extends JpaRepository<LessonEntity, Long> {
    List<LessonEntity> findByPublishedTrueOrderByCurriculumLevelAscIdAsc();
    Optional<LessonEntity> findBySlug(String slug);
}
