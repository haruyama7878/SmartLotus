package vn.smartlotus.backend.shared.api;

import java.time.Instant;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class ApiExceptionHandler {
    private static final Logger logger = LoggerFactory.getLogger(ApiExceptionHandler.class);

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<Map<String, Object>> validation(MethodArgumentNotValidException exception) {
        String message = exception.getBindingResult().getFieldErrors().stream()
            .findFirst()
            .map(error -> error.getField() + ": " + error.getDefaultMessage())
            .orElse("Dữ liệu không hợp lệ");
        return response(HttpStatus.BAD_REQUEST, message);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    ResponseEntity<Map<String, Object>> badRequest(IllegalArgumentException exception) {
        return response(HttpStatus.BAD_REQUEST, exception.getMessage());
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    ResponseEntity<Map<String, Object>> notFound(ResourceNotFoundException exception) {
        return response(HttpStatus.NOT_FOUND, exception.getMessage());
    }

    @ExceptionHandler(ForbiddenOperationException.class)
    ResponseEntity<Map<String, Object>> forbidden(ForbiddenOperationException exception) {
        return response(HttpStatus.FORBIDDEN, exception.getMessage());
    }

    @ExceptionHandler(EmptyResultDataAccessException.class)
    ResponseEntity<Map<String, Object>> emptyResult(EmptyResultDataAccessException exception) {
        return response(HttpStatus.NOT_FOUND, "Không tìm thấy tài nguyên");
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    ResponseEntity<Map<String, Object>> conflict(DataIntegrityViolationException exception) {
        return response(HttpStatus.CONFLICT, "Dữ liệu bị trùng hoặc vi phạm ràng buộc");
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<Map<String, Object>> unexpected(Exception exception) {
        logger.error("Unexpected API error", exception);
        return response(HttpStatus.INTERNAL_SERVER_ERROR, "Không thể xử lý yêu cầu");
    }

    private ResponseEntity<Map<String, Object>> response(HttpStatus status, String message) {
        return ResponseEntity.status(status).body(Map.of(
            "timestamp", Instant.now(),
            "status", status.value(),
            "message", message == null ? "Yêu cầu không hợp lệ" : message
        ));
    }
}
