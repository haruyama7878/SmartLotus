package vn.smartlotus.backend.identity.application;

import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import vn.smartlotus.backend.identity.domain.UserEntity;
import vn.smartlotus.backend.identity.domain.UserRole;
import vn.smartlotus.backend.identity.infrastructure.UserRepository;
import vn.smartlotus.backend.shared.security.CurrentUser;

@Service
public class UserApplicationService {
    private final UserRepository users;
    private final CurrentUser currentUser;

    public UserApplicationService(UserRepository users, CurrentUser currentUser) {
        this.users = users;
        this.currentUser = currentUser;
    }

    @Transactional
    public UserEntity requireCurrentUser() {
        CurrentUser.Identity identity = currentUser.resolve();
        var existingByAuthId = parseUuid(identity.authUserId())
            .flatMap(users::findByAuthUserId);
        return existingByAuthId
            .or(() -> users.findByEmail(identity.email()))
            .orElseGet(() -> {
                UserEntity user = new UserEntity(identity.authUserId(), identity.email(), identity.displayName(), parseRole(identity.role()));
                try {
                    return users.save(user);
                } catch (RuntimeException exception) {
                    return users.findByEmail(identity.email()).orElseThrow(() -> exception);
                }
            });
    }

    private java.util.Optional<UUID> parseUuid(String value) {
        try {
            return java.util.Optional.of(UUID.fromString(value));
        } catch (IllegalArgumentException exception) {
            return java.util.Optional.empty();
        }
    }

    private UserRole parseRole(String value) {
        try {
            return UserRole.valueOf(value);
        } catch (IllegalArgumentException exception) {
            return UserRole.student;
        }
    }

    @Transactional
    public UserEntity updateProfile(String displayName, String avatarUrl) {
        UserEntity user = requireCurrentUser();
        user.updateProfile(displayName, avatarUrl);
        return user;
    }

    @Transactional
    public UserEntity updatePlacement(String placement) {
        UserEntity user = requireCurrentUser();
        user.savePlacement(placement);
        return user;
    }

    public boolean hasRole(UserEntity user, UserRole role) {
        return user.getRole() == role;
    }
}
