package com.schoolmanagement.backend.domain.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "risk_predictions")
public class RiskPrediction {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", nullable = false)
    private Student student;

    @Column(name = "academic_year", nullable = false)
    private String academicYear;

    @Column(nullable = false)
    private int semester;

    @Column(name = "risk_score", precision = 3, scale = 2)
    private BigDecimal riskScore; // 0-1

    @Column(name = "risk_level", length = 20)
    private String riskLevel; // LOW, MEDIUM, HIGH

    @Column(columnDefinition = "TEXT")
    // Simplified JSONB handling. For real production, enable Hypersistence Utils or
    // similar library for JSON types.
    // Or stick to TEXT and parse in service.
    private String factors; // JSON string

    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(name = "risk_reasons", joinColumns = @JoinColumn(name = "prediction_id"))
    @Column(name = "reason")
    private List<String> reasons;

    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(name = "risk_recommendations", joinColumns = @JoinColumn(name = "prediction_id"))
    @Column(name = "recommendation")
    private List<String> interventionRecommendations;

    @Column(name = "priority_level")
    private Integer priorityLevel;

    @Column(name = "intervention_status", length = 20)
    private String interventionStatus; // PENDING, IN_PROGRESS, COMPLETED, NO_ACTION

    @Column(columnDefinition = "TEXT")
    private String interventionNotes;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_to")
    private User assignedTo;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "model_id")
    private MlModel usedModel;

    @Column(name = "predicted_at", nullable = false)
    @Builder.Default
    private Instant predictedAt = Instant.now();

    @Column(name = "updated_at")
    private Instant updatedAt;
}
