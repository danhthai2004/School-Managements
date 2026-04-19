package com.schoolmanagement.backend.domain.entity.admin;

import com.schoolmanagement.backend.domain.entity.location.Province;
import com.schoolmanagement.backend.domain.entity.location.Ward;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "schools", indexes = {
        @Index(name = "idx_school_code", columnList = "code", unique = true),
        @Index(name = "idx_school_province", columnList = "province_code")
})
public class School {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, unique = true, length = 20)
    private String code;

    @Column(name = "province_code")
    private Integer provinceCode;

    @Enumerated(EnumType.STRING)
    @Column(name = "school_level")
    private SchoolLevel schoolLevel;

    @Column
    private String address;

    @Column(name = "enrollment_area")
    private String enrollmentArea;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "province_code", insertable = false, updatable = false)
    private Province province;

    @Column(name = "ward_code")
    private Integer wardCode;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ward_code", insertable = false, updatable = false)
    private Ward ward;

    /**
     * When set, school is marked for pending deletion.
     */
    @Column(name = "pending_delete_at")
    private Instant pendingDeleteAt;

}
