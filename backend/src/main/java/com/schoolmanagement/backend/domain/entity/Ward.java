package com.schoolmanagement.backend.domain.entity;

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

    @Column(name = "short_codename")
    private String shortCodename;

    @Column(name = "district_code")
    private Integer districtCode;
}
