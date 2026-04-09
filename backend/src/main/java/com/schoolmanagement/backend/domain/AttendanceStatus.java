package com.schoolmanagement.backend.domain;

/**
 * Status of student attendance.
 */
public enum AttendanceStatus {
    PRESENT, // Có mặt
    LATE, // Đi trễ
    ABSENT_EXCUSED, // Vắng có phép (Teacher Portal)
    ABSENT_UNEXCUSED // Vắng không phép (Teacher Portal)
}
