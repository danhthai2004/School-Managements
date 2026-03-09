package com.schoolmanagement.backend.domain.attendance;

/**
 * Status of student attendance.
 */
public enum AttendanceStatus {
    PRESENT, // Có mặt
    ABSENT, // Vắng mặt (legacy)
    LATE, // Đi trễ
    EXCUSED, // Vắng có phép (legacy)
    ABSENT_EXCUSED, // Vắng có phép (Teacher Portal)
    ABSENT_UNEXCUSED // Vắng không phép (Teacher Portal)
}
