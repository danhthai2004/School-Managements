package com.schoolmanagement.backend.dto.student;

import lombok.Builder;
import lombok.Data;

import java.util.List;

/**
 * DTO for student learning analysis and statistics.
 */
@Data
@Builder
public class StudentAnalysisDto {
    private String studentId;
    private String studentName;
    private String className;
    private String academicYear;
    private Integer semester;

    // Score statistics
    private Double overallAverage;
    private Double highestScore;
    private Double lowestScore;
    private String bestSubject;
    private String worstSubject;

    // Score distribution
    private int excellentCount; // >= 8.5
    private int goodCount; // 7.0 - 8.4
    private int averageCount; // 5.0 - 6.9
    private int belowAverageCount; // < 5.0

    // Subject scores summary
    private List<SubjectScoreSummary> subjectScores;

    // Attendance statistics
    private int totalAttendanceDays;
    private int presentDays;
    private int absentDays;
    private int lateDays;
    private double attendanceRate;

    // Performance trend (by month)
    private List<MonthlyPerformance> monthlyPerformance;

    // Ranking (if available)
    private Integer classRank;
    private Integer totalStudentsInClass;

    @Data
    @Builder
    public static class SubjectScoreSummary {
        private String subjectId;
        private String subjectName;
        private Double averageScore;
        private String performance; // "EXCELLENT", "GOOD", "AVERAGE", "BELOW_AVERAGE"
        private Double trend; // positive = improving, negative = declining
    }

    @Data
    @Builder
    public static class MonthlyPerformance {
        private String month; // "2026-01"
        private Double averageScore;
        private Double attendanceRate;
    }
}
