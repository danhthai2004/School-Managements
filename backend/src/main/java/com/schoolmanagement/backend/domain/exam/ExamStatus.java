package com.schoolmanagement.backend.domain.exam;

/**
 * Status of an exam schedule.
 */
public enum ExamStatus {
    UPCOMING,       // Sắp diễn ra
    IN_PROGRESS,    // Đang diễn ra
    COMPLETED,      // Đã hoàn thành
    CANCELLED       // Đã hủy
}
