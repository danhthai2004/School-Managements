package com.schoolmanagement.backend.dto.teacher;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ClassSeatMapDto {
    private String classId;
    private String className;
    private String config; // JSON string
    private String updatedAt;
    private String updatedByName;
}
