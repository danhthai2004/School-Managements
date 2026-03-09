package com.schoolmanagement.backend.dto.teacher;

import java.util.List;
import java.util.UUID;

/**
 * DTO cho báo cáo giáo viên
 */
public record TeacherReportDto(
        long totalTeachers,
        long activeTeachers,
        long inactiveTeachers,
        List<TeacherBySubjectDto> teachersBySubject,
        List<TeacherWorkloadDto> workloadList) {
    public record TeacherBySubjectDto(
            UUID subjectId,
            String subjectName,
            long teacherCount) {
    }

    public record TeacherWorkloadDto(
            UUID teacherId,
            String teacherCode,
            String teacherName,
            String primarySubject,
            int assignedClasses,
            int totalPeriodsPerWeek) {
    }
}
