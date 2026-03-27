package com.schoolmanagement.backend.domain.entity.location;

import jakarta.persistence.*;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "wards")
public class Ward {

    @Id
    private Integer code;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String codename;

    @Column(name = "division_type")
    private String divisionType;

    @Column(name = "province_code", nullable = false)
    private Integer provinceCode;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "province_code", insertable = false, updatable = false)
    private Province province;
}
