package com.schoolmanagement.backend.domain.notification;

/**
 * Target audience for homeroom teacher notifications.
 */
public enum RecipientType {
    ALL, // Toàn lớp (HS + PH)
    STUDENTS_ONLY, // Chỉ học sinh
    PARENTS_ONLY, // Chỉ phụ huynh
    SPECIFIC // Đối tượng cụ thể
}
