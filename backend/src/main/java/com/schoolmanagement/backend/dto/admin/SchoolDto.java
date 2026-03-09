package com.schoolmanagement.backend.dto.admin;

import com.schoolmanagement.backend.domain.entity.admin.SchoolLevel;
import java.util.UUID;

public record SchoolDto(
        UUID id,
        String name,
        String code,
        Integer provinceCode,
        String provinceName,
        SchoolLevel schoolLevel,
        String address,
        String enrollmentArea) {
}
