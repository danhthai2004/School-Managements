package com.schoolmanagement.backend.domain.entity.risk;

import com.schoolmanagement.backend.domain.entity.student.Student;
import com.schoolmanagement.backend.domain.entity.classes.ClassRoom;
import com.schoolmanagement.backend.domain.entity.admin.School;
import com.schoolmanagement.backend.domain.risk.RiskTrend;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Bảng snapshot tổng hợp các chỉ số rủi ro đã tính toán trước cho từng học
 * sinh.
 * Được tạo bởi NightlyDataAggregatorService mỗi đêm.
 * Dữ liệu từ bảng này sẽ được ẩn danh rồi gửi lên LLM API để phân tích.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "risk_metrics_snapshots", indexes = {
                @Index(name = "idx_risk_snapshot_student", columnList = "student_id"),
                @Index(name = "idx_risk_snapshot_date", columnList = "snapshot_date"),
                @Index(name = "idx_risk_snapshot_school", columnList = "school_id")
}, uniqueConstraints = {
                @UniqueConstraint(name = "uk_risk_snapshot_student_date", columnNames = { "student_id",
                                "snapshot_date" })
})
public class RiskMetricsSnapshot {

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

        @Column(name = "snapshot_date", nullable = false)
        private LocalDate snapshotDate;

        // ── Attendance metrics ──

        /** Số buổi vắng không phép trong 7 ngày qua */
        @Column(name = "absent_unexcused_7d")
        @Builder.Default
        private int absentUnexcused7d = 0;

        /** Số buổi vắng có phép trong 7 ngày qua */
        @Column(name = "absent_excused_7d")
        @Builder.Default
        private int absentExcused7d = 0;

        /** Số buổi đi trễ trong 7 ngày qua */
        @Column(name = "late_count_7d")
        @Builder.Default
        private int lateCount7d = 0;

        /** Tổng số buổi trong 7 ngày qua */
        @Column(name = "total_sessions_7d")
        @Builder.Default
        private int totalSessions7d = 0;

        /** Tỷ lệ chuyên cần (%) trong 30 ngày qua */
        @Column(name = "attendance_rate_30d", precision = 5, scale = 2)
        private BigDecimal attendanceRate30d;

        // ── Academic metrics ──

        /** Điểm trung bình hiện tại của học kỳ */
        @Column(name = "current_gpa", precision = 4, scale = 2)
        private BigDecimal currentGpa;

        /** Điểm trung bình của snapshot trước (để tính trend) */
        @Column(name = "previous_gpa", precision = 4, scale = 2)
        private BigDecimal previousGpa;

        /** Xu hướng GPA */
        @Enumerated(EnumType.STRING)
        @Column(name = "gpa_trend", length = 20)
        private RiskTrend gpaTrend;

        /** Số môn có điểm trung bình dưới 5.0 */
        @Column(name = "failing_subjects_count")
        @Builder.Default
        private int failingSubjectsCount = 0;

        // ── Behavioral metrics ──

        /** Số lần vi phạm kỷ luật trong 30 ngày qua */
        @Column(name = "conduct_violations_30d")
        @Builder.Default
        private int conductViolations30d = 0;

        // ── Metadata ──

        @Column(name = "created_at", nullable = false, updatable = false)
        @Builder.Default
        private Instant createdAt = Instant.now();
}
