package vn.smartlotus.backend.learning.infrastructure;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import vn.smartlotus.backend.identity.domain.UserEntity;
import vn.smartlotus.backend.learning.domain.QuizAttemptEntity;

public interface QuizAttemptRepository extends JpaRepository<QuizAttemptEntity, Long> {
    List<QuizAttemptEntity> findTop10ByUserAndLessonSlugOrderByCompletedAtDesc(UserEntity user, String lessonSlug);
    List<QuizAttemptEntity> findTop10ByUserOrderByCompletedAtDesc(UserEntity user);
    long countByUser(UserEntity user);
}
