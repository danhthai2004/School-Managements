package com.schoolmanagement.backend.domain.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "facial_recognition_logs")
public class FacialRecognitionLog {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "attendance_id")
    private Attendance attendance;

    @Column(name = "uploaded_image_path")
    private String uploadedImagePath;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "recognized_student_id")
    private Student recognizedStudent;

    @Column(name = "confidence_score", precision = 3, scale = 2)
    private BigDecimal confidenceScore;

    @Column(name = "recognition_status", length = 20)
    private String recognitionStatus; // SUCCESS, FAILED, LOW_CONFIDENCE, MULTIPLE_FACES, NO_FACE

    @Column(name = "processed_at", nullable = false)
    @Builder.Default
    private Instant processedAt = Instant.now();

    @Column(name = "processing_time_ms")
    private Integer processingTimeMs;
}
