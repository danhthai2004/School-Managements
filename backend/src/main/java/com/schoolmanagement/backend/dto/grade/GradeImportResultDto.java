package com.schoolmanagement.backend.dto.grade;

import java.util.List;

/**
 * Result of importing grades from Excel file
 */
public record GradeImportResultDto(
        int totalRows,
        int successCount,
        int failedCount,
        int updatedCount,
        List<ImportError> errors) {

    public record ImportError(
            int rowNumber,
            String studentCode,
            String errorMessage) {
    }
}
