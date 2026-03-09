package com.schoolmanagement.backend.domain.entity.exam;

import com.schoolmanagement.backend.domain.entity.admin.School;

import com.schoolmanagement.backend.domain.exam.ExamSessionStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Kỳ thi (VD: Giữa kỳ 1, Cuối kỳ 2).
 * Mỗi ExamSession chứa nhiều ExamSchedule (lịch thi theo môn+khối).
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "exam_sessions", indexes = {
        @Index(name = "idx_exam_session_school", columnList = "school_id"),
        @Index(name = "idx_exam_session_year", columnList = "academic_year, semester")
})
public class ExamSession {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 150)
    private String name; // "Giữa kỳ 1", "Cuối kỳ 2"

    @Column(name = "academic_year", nullable = false, length = 20)
    private String academicYear;

    @Column(nullable = false)
    private Integer semester;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private ExamSessionStatus status = ExamSessionStatus.DRAFT;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "school_id", nullable = false)
    private School school;

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
