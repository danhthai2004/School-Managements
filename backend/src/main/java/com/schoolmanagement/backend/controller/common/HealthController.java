package com.schoolmanagement.backend.controller.common;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.Map;

@RestController
public class HealthController {

    @GetMapping("/")
    public ResponseEntity<Map<String, Object>> root() {
        return ResponseEntity.ok(Map.of(
                "service", "School Management Backend",
                "status", "UP",
                "timestamp", Instant.now().toString()));
    }

    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> health() {
        return ResponseEntity.ok(Map.of("status", "UP"));
    }

    @org.springframework.beans.factory.annotation.Autowired
    private org.springframework.mail.javamail.JavaMailSender mailSender;

    @org.springframework.beans.factory.annotation.Value("${spring.mail.username:}")
    private String username;

    @org.springframework.beans.factory.annotation.Value("${spring.mail.password:}")
    private String password;

    @GetMapping("/api/mail-test")
    public ResponseEntity<Map<String, String>> testMail(
            @org.springframework.web.bind.annotation.RequestParam String email) {
        
        if (username == null || username.isBlank() || password == null || password.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("status", "FAILED", "reason", "Mail configuration is empty. Set MAIL_USERNAME and MAIL_APP_PASSWORD."));
        }

        try {
            org.springframework.mail.SimpleMailMessage msg = new org.springframework.mail.SimpleMailMessage();
            msg.setFrom(username);
            msg.setTo(email);
            msg.setSubject("[TEST] Mail Configuration SMTP");
            msg.setText("This is a synchronous test email to verify SMTP configuration.");
            mailSender.send(msg);
            return ResponseEntity.ok(Map.of("status", "SUCCESS", "message", "Email sent to " + email));
        } catch (Exception e) {
            String cause = e.getCause() != null ? e.getCause().getMessage() : "Unknown";
            return ResponseEntity.internalServerError().body(Map.of("status", "FAILED", "error", e.getMessage(), "cause", cause));
        }
    }
}

