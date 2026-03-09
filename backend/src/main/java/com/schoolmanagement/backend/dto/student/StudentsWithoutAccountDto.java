package com.schoolmanagement.backend.dto.student;

import java.util.List;
import java.util.UUID;

/**
 * DTO danh sách học sinh chưa có tài khoản
 */
public record StudentsWithoutAccountDto(
        long totalCount,
        List<StudentNoAccountByClassDto> byClass) {

    /**
     * Nhóm học sinh chưa có TK theo lớp
     */
    public record StudentNoAccountByClassDto(
            String className,
            List<StudentBasicDto> students) {
    }

    /**
     * Thông tin cơ bản học sinh
     */
    public record StudentBasicDto(
            UUID id,
            String studentCode,
            String fullName,
            String email) {
    }
}
