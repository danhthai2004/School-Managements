package com.schoolmanagement.backend.dto.attendance;

import java.util.List;

/**
 * Kết quả lưu điểm danh - cho biết có học sinh nào bị bỏ qua không
 */
public record SaveAttendanceResultDto(
        int savedCount,
        List<SkippedStudentDto> skippedStudents) {

    public record SkippedStudentDto(
            String studentId,
            String reason) {
    }

    public boolean hasSkipped() {
        return skippedStudents != null && !skippedStudents.isEmpty();
    }
}
