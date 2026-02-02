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
@Table(name = "learning_analytics")
public class LearningAnalytics {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", nullable = false)
    private Student student;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "subject_id")
    private Subject subject;

    @Column(name = "academic_year", nullable = false)
    private String academicYear;

    @Column(nullable = false)
    private int semester;

    @Column(name = "grade_trend", length = 20)
    private String gradeTrend; // IMPROVING, STABLE, DECLINING

    @Column(name = "trend_value", precision = 5, scale = 2)
    private BigDecimal trendValue;

    @Column(name = "current_average", precision = 4, scale = 2)
    private BigDecimal currentAverage;

    @Column(name = "class_average", precision = 4, scale = 2)
    private BigDecimal classAverage;

    @Column(name = "performance_gap", precision = 5, scale = 2)
    private BigDecimal performanceGap;

    @Column(name = "class_rank")
    private Integer classRank;

    @Column(name = "predicted_final_grade", precision = 4, scale = 2)
    private BigDecimal predictedFinalGrade;

    @Column(name = "confidence_level", precision = 3, scale = 2)
    private BigDecimal confidenceLevel;

    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(name = "analytics_strengths", joinColumns = @JoinColumn(name = "analytics_id"))
    @Column(name = "strength")
    private List<String> strengths;

    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(name = "analytics_weaknesses", joinColumns = @JoinColumn(name = "analytics_id"))
    @Column(name = "weakness")
    private List<String> weaknesses;

    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(name = "analytics_recommendations", joinColumns = @JoinColumn(name = "analytics_id"))
    @Column(name = "recommendation")
    private List<String> recommendations;

    @Column(name = "analyzed_at", nullable = false)
    @Builder.Default
    private Instant analyzedAt = Instant.now();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "model_id")
    private MlModel usedModel;

    @Column(name = "created_at", nullable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();
}
