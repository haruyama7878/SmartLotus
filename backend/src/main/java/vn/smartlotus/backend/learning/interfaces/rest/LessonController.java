package vn.smartlotus.backend.learning.interfaces.rest;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import vn.smartlotus.backend.learning.application.LearningApplicationService;
import vn.smartlotus.backend.learning.domain.LessonEntity;

@RestController
@RequestMapping("/api/lessons")
public class LessonController {
    private final LearningApplicationService learning;

    public LessonController(LearningApplicationService learning) { this.learning = learning; }

    @GetMapping
    public LessonsResponse getLessons() {
        List<LessonResponse> result = learning.publishedLessons().stream().map(LessonResponse::from).toList();
        return new LessonsResponse(result);
    }

    public record LessonsResponse(List<LessonResponse> lessons) {}
    public record LessonResponse(long id, String slug, int curriculumLevel, String title, String topic, String competency, int questionCount) {
        static LessonResponse from(LessonEntity lesson) {
            return new LessonResponse(lesson.getId(), lesson.getSlug(), lesson.getCurriculumLevel(), lesson.getTitle(),
                lesson.getTopic(), lesson.getCompetency(), lesson.getQuestionCount());
        }
    }
}
