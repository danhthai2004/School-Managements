package com.schoolmanagement.backend.dto.admin;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;
import java.util.UUID;

@Data
public class CreateSemesterRequest {
    @NotBlank
    private String name; // "Học kỳ 1"

    @Min(1) @Max(2)
    private int semesterNumber;

    @NotNull
    private UUID academicYearId;

    @NotNull
    private LocalDate startDate;

    @NotNull
    private LocalDate endDate;

    private LocalDate gradeDeadline;
}
