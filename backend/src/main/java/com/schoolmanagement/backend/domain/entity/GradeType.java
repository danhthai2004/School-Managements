package com.schoolmanagement.backend.domain.entity;

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
@Table(name = "grade_types")
public class GradeType {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "type_code", nullable = false, unique = true, length = 20)
    private String typeCode; // e.g., "MIENG", "15_PHUT", "45_PHUT", "GIUA_KY", "CUOI_KY"

    @Column(name = "type_name", nullable = false, length = 50)
    private String typeName;

    @Column(precision = 3, scale = 2)
    private BigDecimal weight; // He so

    @Column(name = "is_active")
    @Builder.Default
    private boolean isActive = true;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "school_id", nullable = false)
    private School school;
}
