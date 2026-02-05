package com.schoolmanagement.backend.dto.report;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/**
 * DTO cho báo cáo học tập (Academic Report)
 */
public record AcademicReportDto(
        long totalGradeRecords,
        String academicYear,
        int semester,
        BigDecimal overallAverageScore,
        List<GradeDistributionDto> gradeDistribution,
        List<SubjectAverageDto> subjectAverages,
        List<TopStudentDto> topStudents,
        List<ClassAverageDto> classAverages) {

    /**
     * Phân bố điểm số theo khoảng
     */
    public record GradeDistributionDto(
            String range, // "0-2", "2-4", "4-6", "6-8", "8-10"
            long count,
            double percentage) {
    }

    /**
     * Điểm trung bình theo môn học
     */
    public record SubjectAverageDto(
            UUID subjectId,
            String subjectName,
            BigDecimal averageScore,
            long studentCount) {
    }

    /**
     * Top học sinh xuất sắc
     */
    public record TopStudentDto(
            UUID studentId,
            String studentCode,
            String studentName,
            String className,
            BigDecimal averageScore,
            String performanceCategory) {
    }

    /**
     * Điểm trung bình theo lớp
     */
    public record ClassAverageDto(
            UUID classId,
            String className,
            int grade,
            BigDecimal averageScore,
            long studentCount,
            long excellentCount,
            long goodCount,
            long averageCount,
            long belowAverageCount) {
    }
}
