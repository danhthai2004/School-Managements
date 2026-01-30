package com.schoolmanagement.backend.dto;

import com.schoolmanagement.backend.domain.entity.SchoolLevel;
import java.time.Instant;
import java.util.UUID;

public record SchoolDto(
        UUID id,
        String name,
        String code,
        Integer provinceCode,
        String provinceName,
        Integer wardCode,
        String wardName,
        SchoolLevel schoolLevel,
        String address,
        String enrollmentArea,
        Instant pendingDeleteAt) {
}
