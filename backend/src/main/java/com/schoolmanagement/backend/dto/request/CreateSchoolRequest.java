package com.schoolmanagement.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateSchoolRequest(
                @NotBlank String registryCode, // Mã trường từ SchoolRegistry - auto-fill name, level, enrollmentArea
                @NotNull Integer provinceCode,
                Integer wardCode, // Optional
                String address // Optional
) {
}
