package vn.smartlotus.backend.classroom.domain;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import vn.smartlotus.backend.identity.domain.UserEntity;

@Entity
@Table(name = "classrooms")
public class ClassroomEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @jakarta.persistence.ManyToOne(optional = false) @jakarta.persistence.JoinColumn(name = "teacher_id") private UserEntity teacher;
    @Column(nullable = false, length = 120) private String name;
    @Column(nullable = false, length = 40) private String label;
    @Column(nullable = false, length = 80) private String subject = "Toán";
    @Column(nullable = false, length = 500) private String description = "";
    @Column(nullable = false, length = 20) private String color = "purple";
    @Column(name = "join_code", nullable = false, unique = true, length = 12) private String joinCode;
    @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt = Instant.now();

    protected ClassroomEntity() {}
    public ClassroomEntity(UserEntity teacher, String name, String label, String subject, String description, String color, String joinCode) {
        this.teacher = teacher; this.name = name; this.label = label; this.subject = subject;
        this.description = description; this.color = color; this.joinCode = joinCode;
    }
    public Long getId() { return id; }
    public String getName() { return name; }
    public String getLabel() { return label; }
    public String getSubject() { return subject; }
    public String getDescription() { return description; }
    public String getColor() { return color; }
    public String getJoinCode() { return joinCode; }
    public UserEntity getTeacher() { return teacher; }

    public void update(String name, String label, String subject, String description, String color) {
        this.name = name;
        this.label = label;
        this.subject = subject;
        this.description = description;
        this.color = color;
    }
}
