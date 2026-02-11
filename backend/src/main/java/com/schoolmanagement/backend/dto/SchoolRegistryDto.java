package com.schoolmanagement.backend.dto;

import com.schoolmanagement.backend.domain.entity.SchoolLevel;

public record SchoolRegistryDto(
        String code,
        String name,
        Integer provinceCode,
        SchoolLevel schoolLevel,
        String enrollmentArea) {
}
