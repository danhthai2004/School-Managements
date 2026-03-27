package com.schoolmanagement.backend.domain.entity.grade;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "regular_scores", indexes = {
        @Index(name = "idx_rs_grade", columnList = "grade_id")
})
public class RegularScore {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "grade_id", nullable = false)
    @com.fasterxml.jackson.annotation.JsonIgnore
    private Grade grade;

    @Column(name = "score_index", nullable = false)
    private int scoreIndex; // 1, 2, 3, 4, ...

    @Column(name = "score_value", precision = 4, scale = 2)
    private BigDecimal scoreValue;
}
