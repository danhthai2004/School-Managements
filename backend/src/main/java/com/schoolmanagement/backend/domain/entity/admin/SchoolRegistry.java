package com.schoolmanagement.backend.domain.entity.admin;

import com.schoolmanagement.backend.domain.entity.location.Province;

import jakarta.persistence.*;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "school_registry", indexes = {
        @Index(name = "idx_registry_province_level", columnList = "province_code, school_level")
})
public class SchoolRegistry {

    @Id
    @Column(length = 10)
    private String code;

    @Column(nullable = false)
    private String name;

    @Column(name = "province_code", nullable = false)
    private Integer provinceCode;

    @Enumerated(EnumType.STRING)
    @Column(name = "school_level", nullable = false)
    private SchoolLevel schoolLevel;

    @Column(name = "enrollment_area")
    private String enrollmentArea;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "province_code", insertable = false, updatable = false)
    private Province province;
}
