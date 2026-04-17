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
    private List<SubGradeColumnDto> subGradeColumns; // metadata of sub-grade columns
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
        private List<SubGradeValueDto> subGrades;
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

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SubGradeValueDto {
        private String id; // SubGrade UUID (for update)
        private String category; // ORAL, TEST_15MIN
        private Integer subIndex; // 1, 2, 3...
        private Double value;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SubGradeColumnDto {
        private String category; // ORAL, TEST_15MIN
        private Integer subIndex;
        private String label; // "Miệng 1", "15' 2", etc.
    }
}
