package com.schoolmanagement.backend.dto.grade;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

/**
 * DTO for Homeroom Grade Summary — shows all subjects × all students
 * for the homeroom teacher's class.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HomeroomGradeSummaryDto {
    private String classId;
    private String className;
    private String academicYear;
    private Integer semester;
    private List<SubjectInfo> subjects;
    private List<StudentSummaryRow> students;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SubjectInfo {
        private String subjectId;
        private String subjectName;
        private Integer regularCount; // 2, 3, or 4
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StudentSummaryRow {
        private String studentId;
        private String studentCode;
        private String fullName;
        /** subjectId → SubjectGradeDetail */
        private Map<String, SubjectGradeDetail> subjectGrades;
        private Double overallAverage;
        private String performanceCategory; // Giỏi, Khá, TB, Yếu, Kém
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SubjectGradeDetail {
        private List<Double> regularGrades; // ordered by gradeIndex
        private Double midTerm;
        private Double finalTerm;
        private Double average; // TBM (trung bình môn)
    }
}
