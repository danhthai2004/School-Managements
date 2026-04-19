package com.schoolmanagement.backend.dto.admin;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateSchoolRequest(
        @NotBlank String schoolName,
        @NotNull Integer provinceCode,
        String address, // Optional

        @NotBlank String schoolCode,
        Integer wardCode,
        String enrollmentArea
) {
}

