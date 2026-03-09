package com.schoolmanagement.backend.exception;

import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.NestedExceptionUtils;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.Instant;
import java.util.stream.Collectors;

@RestControllerAdvice
public class RestExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(RestExceptionHandler.class);

    @ExceptionHandler(ApiException.class)
    public ResponseEntity<ApiError> handleApi(ApiException ex, HttpServletRequest req) {
        var status = ex.getStatus();
        var body = new ApiError(
                Instant.now(),
                status.value(),
                status.getReasonPhrase(),
                ex.getMessage(),
                req.getRequestURI());
        return ResponseEntity.status(status).body(body);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiError> handleValidation(MethodArgumentNotValidException ex, HttpServletRequest req) {
        var message = ex.getBindingResult().getFieldErrors().stream()
                .map(FieldError::getDefaultMessage)
                .collect(Collectors.joining("; "));
        var status = HttpStatus.BAD_REQUEST;
        var body = new ApiError(Instant.now(), status.value(), status.getReasonPhrase(), message, req.getRequestURI());
        return ResponseEntity.status(status).body(body);
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ApiError> handleDataIntegrity(DataIntegrityViolationException ex, HttpServletRequest req) {
        String message = "Lỗi ràng buộc dữ liệu.";
        Throwable rootCause = NestedExceptionUtils.getRootCause(ex);
        if (rootCause != null && rootCause.getMessage().contains("violates unique constraint")) {
            // Can be more specific here if needed by parsing the constraint name
            message = "Dữ liệu bị trùng lặp: " + rootCause.getMessage();
        }
        log.error("Data integrity violation", ex);
        var status = HttpStatus.CONFLICT;
        var body = new ApiError(Instant.now(), status.value(), status.getReasonPhrase(), message, req.getRequestURI());
        return ResponseEntity.status(status).body(body);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiError> handleAll(Exception ex, HttpServletRequest req) {
        log.error("Unhandled exception", ex); // Log the full stack trace
        var status = HttpStatus.INTERNAL_SERVER_ERROR;
        var body = new ApiError(
                Instant.now(),
                status.value(),
                status.getReasonPhrase(),
                "Đã có lỗi xảy ra. Vui lòng thử lại. Message: " + ex.getMessage(), // Include exception message
                req.getRequestURI());
        return ResponseEntity.status(status).body(body);
    }
}
