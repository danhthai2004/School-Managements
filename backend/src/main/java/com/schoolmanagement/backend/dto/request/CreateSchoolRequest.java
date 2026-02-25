package com.schoolmanagement.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateSchoolRequest(
        @NotBlank String schoolName,
        String schoolCode,
        @NotNull Integer provinceCode,
        @NotNull Integer wardCode,
        String enrollmentArea,
        String address) {
}
