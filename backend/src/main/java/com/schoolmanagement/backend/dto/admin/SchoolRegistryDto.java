package com.schoolmanagement.backend.dto.admin;

import com.schoolmanagement.backend.domain.entity.admin.SchoolLevel;

public record SchoolRegistryDto(
        String code,
        String name,
        Integer provinceCode,
        SchoolLevel schoolLevel,
        String enrollmentArea) {
}
