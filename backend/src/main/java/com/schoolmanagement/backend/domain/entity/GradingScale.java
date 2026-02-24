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
@Table(name = "grading_scales")
public class GradingScale {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "scale_name", nullable = false, unique = true, length = 50)
    private String scaleName;

    @Column(name = "min_score", nullable = false, precision = 4, scale = 2)
    private BigDecimal minScore;

    @Column(name = "max_score", nullable = false, precision = 4, scale = 2)
    private BigDecimal maxScore;

    @Column(nullable = false, length = 20)
    private String category; // e.g., GIOI, KHA, TRUNG_BINH, YEU, KEM

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "is_active")
    @Builder.Default
    private boolean isActive = true;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "school_id", nullable = false)
    private School school;

    @Column(name = "created_at", nullable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();
}
