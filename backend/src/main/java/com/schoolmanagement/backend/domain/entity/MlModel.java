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
@Table(name = "ml_models")
public class MlModel {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "model_name", nullable = false, unique = true, length = 100)
    private String modelName;

    @Column(name = "model_type", nullable = false, length = 50)
    private String modelType; // RISK_PREDICTION, GRADE_PREDICTION, RECOMMENDATION, FACIAL_RECOGNITION

    @Column(name = "model_version", nullable = false, length = 20)
    private String modelVersion;

    @Column(name = "model_path", length = 500)
    private String modelPath;

    @Column(precision = 5, scale = 4)
    private BigDecimal accuracy;

    @Column(name = "precision_score", precision = 5, scale = 4)
    private BigDecimal precisionScore;

    @Column(precision = 5, scale = 4)
    private BigDecimal recall;

    @Column(name = "f1_score", precision = 5, scale = 4)
    private BigDecimal f1Score;

    @Column(name = "training_date")
    private Instant trainingDate;

    @Column(name = "is_active")
    @Builder.Default
    private boolean isActive = false;

    @Column(columnDefinition = "TEXT")
    private String parameters; // JSON string

    // Models can be global (school_id null) or specific to a school
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "school_id")
    private School school;

    @Column(name = "created_at", nullable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();
}
