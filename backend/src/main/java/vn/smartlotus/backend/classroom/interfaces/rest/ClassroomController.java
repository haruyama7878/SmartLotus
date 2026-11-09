package vn.smartlotus.backend.classroom.interfaces.rest;

import java.util.List;
import java.util.Map;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import vn.smartlotus.backend.classroom.application.ClassroomApplicationService;
import vn.smartlotus.backend.classroom.domain.ClassroomEntity;

@RestController
@RequestMapping("/api/classrooms")
public class ClassroomController {
    private final ClassroomApplicationService classrooms;
    public ClassroomController(ClassroomApplicationService classrooms) { this.classrooms = classrooms; }

    @GetMapping
    public ClassroomList getMine() {
        return new ClassroomList(classrooms.listMine().stream().map(ClassroomResponse::from).toList());
    }

    @PostMapping
    public ResponseEntity<Map<String, ClassroomResponse>> create(@Valid @RequestBody CreateRequest request) {
        ClassroomEntity classroom = classrooms.create(new ClassroomApplicationService.CreateClassroomCommand(
            request.name(), request.label(), request.subject(), request.description(), request.color()));
        return ResponseEntity.status(201).body(Map.of("classroom", ClassroomResponse.from(classroom)));
    }

    @PatchMapping
    public Map<String, ClassroomResponse> update(@Valid @RequestBody UpdateRequest request) {
        ClassroomEntity classroom = classrooms.update(request.id(),
            new ClassroomApplicationService.CreateClassroomCommand(
                request.name(), request.label(), request.subject(), request.description(), request.color()));
        return Map.of("classroom", ClassroomResponse.from(classroom));
    }

    @DeleteMapping("/{id}")
    public Map<String, Boolean> delete(@PathVariable long id) {
        classrooms.delete(id);
        return Map.of("ok", true);
    }

    public record ClassroomList(List<ClassroomResponse> classrooms) {}
    public record CreateRequest(
        @NotBlank @Size(max = 120) String name,
        @NotBlank @Size(max = 40) String label,
        @NotBlank @Size(max = 80) String subject,
        @Size(max = 500) String description,
        @NotBlank String color
    ) {}
    public record UpdateRequest(
        long id,
        @NotBlank @Size(max = 120) String name,
        @NotBlank @Size(max = 40) String label,
        @NotBlank @Size(max = 80) String subject,
        @Size(max = 500) String description,
        @NotBlank String color
    ) {}
    public record ClassroomResponse(String id, String name, String label, String subject, String description, String color, String joinCode, String teacherName, int studentCount) {
        static ClassroomResponse from(ClassroomEntity classroom) {
            return new ClassroomResponse(String.valueOf(classroom.getId()), classroom.getName(), classroom.getLabel(), classroom.getSubject(),
                classroom.getDescription(), classroom.getColor(), classroom.getJoinCode(), classroom.getTeacher().getDisplayName(), 0);
        }
    }
}
