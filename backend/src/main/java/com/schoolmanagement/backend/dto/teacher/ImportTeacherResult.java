package com.schoolmanagement.backend.dto.teacher;

import java.util.List;

/**
 * Result of importing teachers from Excel file
 */
public record ImportTeacherResult(
        int totalRows,
        int successCount,
        int failedCount,
        List<ImportError> errors) {

    public record ImportError(
            int rowNumber,
            String teacherName,
            String errorMessage) {
    }
}
