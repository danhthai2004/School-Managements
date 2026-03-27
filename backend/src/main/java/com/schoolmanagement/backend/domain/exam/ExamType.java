package com.schoolmanagement.backend.domain.exam;

/**
 * Types of exams.
 */
public enum ExamType {
    QUIZ,           // Kiểm tra nhanh (15 phút)
    REGULAR,        // Kiểm tra thường (45 phút)
    MIDTERM,        // Thi giữa kỳ
    FINAL           // Thi cuối kỳ
}
