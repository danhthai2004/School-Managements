package com.schoolmanagement.backend.dto.grade;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudentRankingDto {
    private UUID studentId;
    private String studentCode;
    private String fullName;
    private Double gpa;
    private String performanceCategory;
    private String conduct;
    private Integer rankInClass;
}
