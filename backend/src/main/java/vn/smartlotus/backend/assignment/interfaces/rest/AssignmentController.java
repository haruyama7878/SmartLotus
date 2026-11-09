package vn.smartlotus.backend.assignment.interfaces.rest;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import vn.smartlotus.backend.assignment.application.AssignmentApplicationService;
import vn.smartlotus.backend.assignment.domain.AssignmentEntity;

@RestController
@RequestMapping("/api/assignments")
public class AssignmentController {
    private final AssignmentApplicationService assignments;
    private final ObjectMapper objectMapper;

    public AssignmentController(AssignmentApplicationService assignments, ObjectMapper objectMapper) {
        this.assignments = assignments;
        this.objectMapper = objectMapper;
    }

    @GetMapping
    public AssignmentList list() {
        return new AssignmentList(assignments.listMine().stream()
            .map(assignment -> AssignmentResponse.from(assignment, objectMapper))
            .toList());
    }

    @PostMapping
    public ResponseEntity<Map<String, AssignmentResponse>> create(@Valid @RequestBody CreateRequest request) {
        long classroomId = parseClassroomId(request.classroomId());
        AssignmentEntity assignment = assignments.create(new AssignmentApplicationService.CreateAssignmentCommand(
            classroomId, request.title(), request.topic(), request.curriculumLevel(), request.dueAt(),
            request.durationMinutes(), request.questions().toString()));
        return ResponseEntity.status(201).body(Map.of("assignment", AssignmentResponse.from(assignment, objectMapper)));
    }

    /** Frontend gửi classroomId dạng chuỗi ("6") — chấp nhận cả chuỗi và số. */
    private long parseClassroomId(JsonNode value) {
        if (value == null || value.isNull()) {
            throw new IllegalArgumentException("classroomId là bắt buộc");
        }
        if (value.isNumber()) {
            return value.asLong();
        }
        try {
            return Long.parseLong(value.asText().trim());
        } catch (NumberFormatException ex) {
            throw new IllegalArgumentException("classroomId không hợp lệ");
        }
    }

    public record AssignmentList(List<AssignmentResponse> assignments) {}
    public record CreateRequest(
        JsonNode classroomId,
        @NotBlank @Size(max = 180) String title,
        @NotBlank @Size(max = 180) String topic,
        @Min(1) int curriculumLevel,
        @NotNull Instant dueAt,
        @Min(1) int durationMinutes,
        @NotNull JsonNode questions
    ) {}
    public record AssignmentResponse(String id, String title, String topic, int curriculumLevel, String dueDate,
                                     int durationMinutes, JsonNode questions, String classroomId,
                                     ClassroomSummary classroom, int totalStudents, int submittedCount,
                                     int gradedCount, String className) {
        static AssignmentResponse from(AssignmentEntity assignment, ObjectMapper objectMapper) {
            JsonNode questionData = null;
            try {
            questionData = objectMapper.readTree(assignment.getQuestions());
            } catch (Exception ignored) {
            }
            var classroom = assignment.getClassroom();
            return new AssignmentResponse(String.valueOf(assignment.getId()), assignment.getTitle(), assignment.getTopic(),
                assignment.getCurriculumLevel(), assignment.getDueAt().toString(), assignment.getDurationMinutes(), questionData,
                String.valueOf(classroom.getId()), new ClassroomSummary(String.valueOf(classroom.getId()), classroom.getName(), classroom.getLabel()),
                0, 0, 0, classroom.getLabel());
        }
    }
    public record ClassroomSummary(String id, String name, String label) {}
}
