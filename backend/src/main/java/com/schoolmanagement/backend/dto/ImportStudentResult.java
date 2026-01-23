package com.schoolmanagement.backend.dto;

import java.util.List;

/**
 * Result of importing students from Excel file
 */
public record ImportStudentResult(
        int totalRows,
        int successCount,
        int failedCount,
        int assignedToClassCount,
        List<ImportError> errors) {

    public record ImportError(
            int rowNumber,
            String studentName,
            String errorMessage) {
    }
}
