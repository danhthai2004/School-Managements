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
@Table(name = "facial_recognition_data")
public class FacialRecognitionData {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", nullable = false)
    private Student student;

    @Column(name = "face_encoding", nullable = false, columnDefinition = "TEXT")
    private String faceEncoding; // JSON array of embeddings

    @Column(name = "image_path", nullable = false)
    private String imagePath;

    @Column(name = "image_hash", unique = true, length = 64)
    private String imageHash;

    @Column(name = "quality_score", precision = 3, scale = 2)
    private BigDecimal qualityScore; // 0-1

    @Column(name = "is_active")
    @Builder.Default
    private boolean isActive = true;

    @Column(name = "enrolled_at", nullable = false)
    @Builder.Default
    private Instant enrolledAt = Instant.now();

    @Column(name = "updated_at")
    private Instant updatedAt;
}
