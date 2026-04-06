package com.schoolmanagement.backend.dto.risk;

import com.schoolmanagement.backend.domain.risk.RiskCategory;
import com.schoolmanagement.backend.domain.risk.RiskTrend;
import com.schoolmanagement.backend.domain.risk.TeacherFeedbackStatus;
import lombok.*;

import java.time.LocalDate;
import java.util.UUID;

/**
 * DTO trả về cho Frontend hiển thị kết quả đánh giá rủi ro của 1 học sinh.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RiskAssessmentDto {
    private UUID id;
    private UUID studentId;
    private String studentName;
    private String studentCode;
    private String className;
    private UUID classId;

    private LocalDate assessmentDate;
    private int riskScore;
    private RiskCategory riskCategory;
    private RiskTrend riskTrend;
    private String aiReason;
    private String aiAdvice;
    private TeacherFeedbackStatus teacherFeedback;
    private String teacherNote;
    private boolean notificationSent;
}
