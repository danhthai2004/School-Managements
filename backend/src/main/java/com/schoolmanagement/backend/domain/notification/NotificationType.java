package com.schoolmanagement.backend.domain.notification;

public enum NotificationType {
    SYSTEM,
    EXAM,
    SCHEDULE,
    MANUAL,
    EXAM_SCHEDULE, // Lịch thi
    PARENT_MEETING, // Họp phụ huynh
    ACADEMIC_WARNING, // Cảnh báo học tập
    BEHAVIOR_WARNING, // Cảnh báo hành vi
    EVENT, // Sự kiện
    HOMEWORK, // Bài tập về nhà
    OTHER // Khác
}
