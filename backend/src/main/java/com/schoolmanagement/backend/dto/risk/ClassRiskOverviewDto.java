package com.schoolmanagement.backend.dto.risk;

import lombok.*;

import java.util.UUID;

/**
 * DTO tổng quan rủi ro cho 1 lớp học (dùng cho Heatmap trên Dashboard).
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ClassRiskOverviewDto {
    private UUID classId;
    private String className;
    private int grade;
    private int totalStudents;
    private int highRiskCount; // score >= 80
    private int mediumRiskCount; // 50 <= score < 80
    private int lowRiskCount; // score < 50
    private String riskLevel; // "SAFE", "WATCH", "DANGER"
}
