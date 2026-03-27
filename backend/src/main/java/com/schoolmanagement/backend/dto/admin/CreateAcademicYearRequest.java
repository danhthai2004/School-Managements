package com.schoolmanagement.backend.dto.admin;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;
import java.util.UUID;

@Data
public class CreateAcademicYearRequest {
    @NotBlank
    private String name; // "2025-2026"

    @NotNull
    private LocalDate startDate;

    @NotNull
    private LocalDate endDate;
}
