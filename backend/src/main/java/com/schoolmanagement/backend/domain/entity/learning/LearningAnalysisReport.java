package com.schoolmanagement.backend.domain.entity.learning;

import com.schoolmanagement.backend.domain.entity.student.Student;
import com.schoolmanagement.backend.domain.entity.admin.Semester;
import com.schoolmanagement.backend.domain.entity.admin.School;
import com.schoolmanagement.backend.domain.entity.classes.ClassRoom;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

/**
 * Lưu trữ kết quả phân tích học tập do AI sinh ra cho từng học sinh mỗi kỳ.
 * Mỗi bản ghi chứa phân tích điểm mạnh/yếu, dự đoán GPA, và lời khuyên
 * học tập cá nhân hóa.
 *
 * Dữ liệu này được hiển thị trên:
 * - Student Profile Tab (cho Giáo viên/Admin)
 * - Student Portal "AI Cố vấn Học tập" (cho Học sinh)
 * - School Admin Dashboard (tổng quan toàn trường)
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "learning_analysis_reports", indexes = {
        @Index(name = "idx_learning_report_student", columnList = "student_id"),
        @Index(name = "idx_learning_report_semester", columnList = "semester_id"),
        @Index(name = "idx_learning_report_school", columnList = "school_id"),
        @Index(name = "idx_learning_report_created", columnList = "created_at")
}, uniqueConstraints = {
        @UniqueConstraint(
                name = "uk_learning_report_student_semester",
                columnNames = {"student_id", "semester_id"}
        )
})
public class LearningAnalysisReport {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", nullable = false)
    private Student student;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "semester_id", nullable = false)
    private Semester semester;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "school_id", nullable = false)
    private School school;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "class_id")
    private ClassRoom classRoom;

    /** Các môn/kỹ năng nổi trội (JSON array hoặc text ngắn gọn) */
    @Column(columnDefinition = "TEXT")
    private String strengths;

    /** Các môn/kỹ năng cần cải thiện (JSON array hoặc text ngắn gọn) */
    @Column(columnDefinition = "TEXT")
    private String weaknesses;

    /** Phân tích chi tiết từ AI (Markdown format) */
    @Column(name = "detailed_analysis", columnDefinition = "TEXT")
    private String detailedAnalysis;

    /** Lời khuyên/Lộ trình học tập cá nhân hóa (Markdown format) */
    @Column(name = "learning_advice", columnDefinition = "TEXT")
    private String learningAdvice;

    /** Điểm trung bình dự kiến cuối kỳ do AI dự đoán */
    @Column(name = "predicted_gpa")
    private Double predictedGpa;

    /** Điểm trung bình thực tế hiện tại tại thời điểm phân tích */
    @Column(name = "current_gpa")
    private Double currentGpa;

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
