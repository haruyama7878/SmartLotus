package vn.smartlotus.backend.identity.infrastructure;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import vn.smartlotus.backend.identity.domain.UserEntity;

public interface UserRepository extends JpaRepository<UserEntity, Long> {
    Optional<UserEntity> findByAuthUserId(UUID authUserId);
    Optional<UserEntity> findByEmail(String email);
}
