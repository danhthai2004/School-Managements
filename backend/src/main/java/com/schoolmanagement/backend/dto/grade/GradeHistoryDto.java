package com.schoolmanagement.backend.dto.grade;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GradeHistoryDto {
    private UUID id;
    private String studentName;
    private String studentCode;
    private String subjectName;
    private String fieldChanged;
    private String oldValue;
    private String newValue;
    private String changedBy;
    private String changedAt;
    private String reason;
}
