package com.schoolmanagement.backend.dto.admin;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SemesterDto {
    private UUID id;
    private String name;
    private int semesterNumber;
    private UUID academicYearId;
    private String academicYearName;
    private LocalDate startDate;
    private LocalDate endDate;
    private LocalDate gradeDeadline;
    private String status;
}
