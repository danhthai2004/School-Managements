package com.schoolmanagement.backend.domain.entity.risk;

import com.schoolmanagement.backend.domain.entity.student.Student;
import com.schoolmanagement.backend.domain.entity.classes.ClassRoom;
import com.schoolmanagement.backend.domain.entity.admin.School;
import com.schoolmanagement.backend.domain.risk.RiskCategory;
import com.schoolmanagement.backend.domain.risk.RiskTrend;
import com.schoolmanagement.backend.domain.risk.TeacherFeedbackStatus;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Lưu trữ lịch sử kết quả phân tích rủi ro do AI chấm.
 * Mỗi bản ghi là kết quả đánh giá của 1 lần chạy AI cho 1 học sinh.
 * Dùng để vẽ biểu đồ xu hướng (LineChart) trên Frontend.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "risk_assessment_history", indexes = {
        @Index(name = "idx_risk_history_student", columnList = "student_id"),
        @Index(name = "idx_risk_history_date", columnList = "assessment_date"),
        @Index(name = "idx_risk_history_school", columnList = "school_id"),
        @Index(name = "idx_risk_history_score", columnList = "risk_score")
})
public class RiskAssessmentHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", nullable = false)
    private Student student;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "class_id")
    private ClassRoom classRoom;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "school_id", nullable = false)
    private School school;

    @Column(name = "assessment_date", nullable = false)
    private LocalDate assessmentDate;

    /** Điểm rủi ro từ 0 (an toàn) đến 100 (nguy hiểm) */
    @Column(name = "risk_score", nullable = false)
    private int riskScore;

    /** Phân loại rủi ro chính */
    @Enumerated(EnumType.STRING)
    @Column(name = "risk_category", nullable = false, length = 20)
    private RiskCategory riskCategory;

    /** Xu hướng so với lần đánh giá trước */
    @Enumerated(EnumType.STRING)
    @Column(name = "risk_trend", length = 20)
    private RiskTrend riskTrend;

    /** Lý do AI giải thích (Explainable AI), tối đa 100 ký tự */
    @Column(name = "ai_reason", length = 200)
    private String aiReason;

    /** Lời khuyên AI dễ đọc dành cho Học Sinh (ngôn ngữ thân thiện) */
    @Column(name = "ai_advice", length = 500)
    private String aiAdvice;

    /** Phản hồi của giáo viên chủ nhiệm */
    @Enumerated(EnumType.STRING)
    @Column(name = "teacher_feedback", length = 20)
    @Builder.Default
    private TeacherFeedbackStatus teacherFeedback = TeacherFeedbackStatus.PENDING;

    /** Ghi chú thêm của giáo viên khi xác nhận / bác bỏ */
    @Column(name = "teacher_note", length = 500)
    private String teacherNote;

    /** Đã gửi thông báo FCM chưa */
    @Column(name = "notification_sent")
    @Builder.Default
    private boolean notificationSent = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at")
    private Instant updatedAt;

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = Instant.now();
    }
}
