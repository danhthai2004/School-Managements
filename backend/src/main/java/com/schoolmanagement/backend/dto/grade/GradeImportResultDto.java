package com.schoolmanagement.backend.dto.grade;

import java.util.List;
import com.schoolmanagement.backend.dto.grade.GradeBookDto.StudentGradeDto;

/**
 * Result of importing grades from Excel file
 */
public record GradeImportResultDto(
                int totalRows,
                int successCount,
                int failedCount,
                int updatedCount,
                List<ImportError> errors,
                List<StudentGradeDto> previewData) {

        public record ImportError(
                        int rowNumber,
                        String studentCode,
                        String errorMessage) {
        }
}
