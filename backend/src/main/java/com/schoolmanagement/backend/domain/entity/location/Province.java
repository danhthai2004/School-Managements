package com.schoolmanagement.backend.domain.entity.location;

import jakarta.persistence.*;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "provinces")
public class Province {

    @Id
    private Integer code;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String codename;

    @Column(name = "division_type")
    private String divisionType;

    @Column(name = "phone_code")
    private Integer phoneCode;
}
