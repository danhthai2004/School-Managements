package com.schoolmanagement.backend.dto.timetable;

import java.util.List;
import java.util.UUID;

/**
 * DTO cho báo cáo Thời khóa biểu (Timetable Report)
 */
public record TimetableReportDto(
        long totalTimetables,
        long officialTimetables,
        long draftTimetables,
        String currentAcademicYear,
        int currentSemester,
        List<TimetableSummaryDto> timetables,
        List<ClassTimetableStatusDto> classStatuses,
        TimetableCoverageDto coverage) {

    /**
     * Tóm tắt thời khóa biểu
     */
    public record TimetableSummaryDto(
            UUID timetableId,
            String name,
            String academicYear,
            int semester,
            String status,
            String createdAt,
            int totalSlots,
            int filledSlots) {
    }

    /**
     * Trạng thái TKB của lớp
     */
    public record ClassTimetableStatusDto(
            UUID classId,
            String className,
            int grade,
            boolean hasTimetable,
            int totalSlots,
            int filledSlots,
            double fillRate) {
    }

    /**
     * Thống kê phủ sóng TKB
     */
    public record TimetableCoverageDto(
            long totalClasses,
            long classesWithTimetable,
            long classesWithoutTimetable,
            double coverageRate) {
    }
}
