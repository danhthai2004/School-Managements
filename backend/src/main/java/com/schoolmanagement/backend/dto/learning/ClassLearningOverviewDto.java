package com.schoolmanagement.backend.dto.learning;

import lombok.*;

import java.util.UUID;

/**
 * DTO hiển thị tổng quan chất lượng học tập của 1 lớp trên Admin Dashboard.
 * Tương tự ClassRiskOverviewDto nhưng cho Learning Analytics.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ClassLearningOverviewDto {
    private UUID classId;
    private String className;
    private int gradeLevel;
    private long totalStudents;

    /** Số HS đã có báo cáo phân tích */
    private long analyzedCount;

    /** GPA trung bình dự đoán của lớp */
    private Double avgPredictedGpa;

    /** GPA trung bình thực tế hiện tại của lớp */
    private Double avgCurrentGpa;

    /** Số HS có GPA dự đoán >= 8.0 (Giỏi) */
    private long excellentCount;

    /** Số HS có GPA dự đoán >= 6.5 và < 8.0 (Khá) */
    private long goodCount;

    /** Số HS có GPA dự đoán >= 5.0 và < 6.5 (Trung bình) */
    private long averageCount;

    /** Số HS có GPA dự đoán < 5.0 (Yếu) */
    private long weakCount;
}
