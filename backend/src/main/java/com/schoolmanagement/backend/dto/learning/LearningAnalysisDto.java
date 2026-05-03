package com.schoolmanagement.backend.dto.learning;

import lombok.*;

import java.time.Instant;
import java.util.UUID;

/**
 * DTO trả về cho Frontend hiển thị báo cáo phân tích học tập của 1 học sinh.
 * Được dùng chung cho cả Student Portal, Teacher Profile Tab, và Admin Dashboard.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LearningAnalysisDto {
    private UUID id;
    private UUID studentId;
    private String studentName;
    private String studentCode;
    private String className;
    private UUID classId;
    private String semesterName;

    private String strengths;
    private String weaknesses;
    private String detailedAnalysis;
    private String learningAdvice;
    private Double predictedGpa;
    private Double currentGpa;
    private Instant analyzedAt;
}
