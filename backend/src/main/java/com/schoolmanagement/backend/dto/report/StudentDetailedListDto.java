package com.schoolmanagement.backend.dto.report;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * DTO chi tiết danh sách học sinh theo lớp
 */
public record StudentDetailedListDto(
        UUID classId,
        String className,
        int grade,
        String academicYear,
        int capacity,
        int currentStudentCount,
        List<StudentDetailDto> students) {

    /**
     * Chi tiết một học sinh
     */
    public record StudentDetailDto(
            UUID id,
            String studentCode,
            String fullName,
            String gender,
            LocalDate dateOfBirth,
            String email,
            String phone,
            String status,
            boolean hasAccount,
            LocalDate enrollmentDate) {
    }
}
