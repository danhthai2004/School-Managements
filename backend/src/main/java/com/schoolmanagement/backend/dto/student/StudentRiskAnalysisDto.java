package com.schoolmanagement.backend.dto.student;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudentRiskAnalysisDto {
    private String studentId;
    private String studentName;
    private RiskLevel riskLevel;
    private String riskType;
    private List<MetricDto> metrics;
    private List<String> issues;
    private List<String> suggestions;

    public enum RiskLevel {
        HIGH, MEDIUM, LOW
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MetricDto {
        private String label;
        private int value;
        private int maxValue;
    }
}
