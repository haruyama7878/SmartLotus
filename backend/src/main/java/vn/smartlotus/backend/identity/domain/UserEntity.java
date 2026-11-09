package vn.smartlotus.backend.identity.domain;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "users")
public class UserEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "auth_user_id", unique = true)
    @JdbcTypeCode(SqlTypes.UUID)
    private UUID authUserId;

    @Column(nullable = false, unique = true, length = 255)
    private String email;

    @Column(name = "display_name", nullable = false, length = 120)
    private String displayName;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(nullable = false, columnDefinition = "user_role")
    private UserRole role = UserRole.student;

    @Column(nullable = false, length = 12)
    private String avatar = "MA";

    @Column(name = "avatar_url")
    private String avatarUrl;

    @Column(name = "placement", columnDefinition = "jsonb")
    @JdbcTypeCode(SqlTypes.JSON)
    private String placement;

    @Column(name = "lotus_points", nullable = false)
    private int lotusPoints;

    @Column(name = "current_streak", nullable = false)
    private int currentStreak;

    @Column(name = "longest_streak", nullable = false)
    private int longestStreak;

    @Column(name = "last_active_at", nullable = false)
    private Instant lastActiveAt = Instant.now();

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    protected UserEntity() {}

    public UserEntity(String authUserId, String email, String displayName) {
        this(authUserId, email, displayName, UserRole.student);
    }

    public UserEntity(String authUserId, String email, String displayName, UserRole role) {
        this.authUserId = toUuid(authUserId);
        this.email = email;
        this.displayName = displayName;
        this.role = role == null ? UserRole.student : role;
    }

    public Long getId() { return id; }
    public UUID getAuthUserId() { return authUserId; }
    public String getEmail() { return email; }
    public String getDisplayName() { return displayName; }
    public UserRole getRole() { return role; }
    public String getAvatar() { return avatar; }
    public String getAvatarUrl() { return avatarUrl; }
    public String getPlacement() { return placement; }
    public int getLotusPoints() { return lotusPoints; }
    public int getCurrentStreak() { return currentStreak; }
    public int getLongestStreak() { return longestStreak; }
    public Instant getLastActiveAt() { return lastActiveAt; }

    public void updateProfile(String displayName, String avatarUrl) {
        this.displayName = displayName;
        this.avatarUrl = avatarUrl;
    }

    public void savePlacement(String placement) { this.placement = placement; }
    public void addPoints(int points) { this.lotusPoints += Math.max(points, 0); }
    public void markActive() { this.lastActiveAt = Instant.now(); }

    private UUID toUuid(String value) {
        try {
            return value == null ? null : UUID.fromString(value);
        } catch (IllegalArgumentException exception) {
            return null;
        }
    }
}
