package com.schoolmanagement.backend.dto.grade;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GradeBookDto {
    private String subjectId;
    private String subjectName;
    private String className;
    private String academicYear;
    private Integer semester;
    private Integer regularAssessmentCount; // 2, 3, or 4
    private boolean canEdit;
    private List<StudentGradeDto> students;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StudentGradeDto {
        private String studentId;
        private String studentCode;
        private String fullName;
        private List<GradeValueDto> grades;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GradeValueDto {
        private String type; // REGULAR, MID_TERM, FINAL_TERM
        private Integer index; // 1-4 for REGULAR
        private Double value;
    }
}
