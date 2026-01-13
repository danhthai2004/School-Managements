package com.schoolmanagement.backend.dto.request;

import jakarta.validation.constraints.NotBlank;

public record CreateSchoolRequest(
        @NotBlank String name,
        @NotBlank String code
) {}
