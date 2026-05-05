package com.schoolmanagement.backend.dto.grade;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for reading/writing the school's grading weight configuration.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GradingConfigDto {
    private int regularWeight;
    private int midtermWeight;
    private int finalWeight;
    private String updatedAt;
    private String updatedBy;
}
