package com.schoolmanagement.backend.domain.entity;

import com.schoolmanagement.backend.domain.ExamStatus;
import com.schoolmanagement.backend.domain.ExamType;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

/**
 * Entity to manage exam schedules.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "exam_schedules", indexes = {
        @Index(name = "idx_exam_class", columnList = "classroom_id"),
        @Index(name = "idx_exam_subject", columnList = "subject_id"),
        @Index(name = "idx_exam_date", columnList = "exam_date"),
        @Index(name = "idx_exam_school", columnList = "school_id"),
        @Index(name = "idx_exam_session", columnList = "exam_session_id")
})
public class ExamSchedule {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "exam_session_id")
    private ExamSession examSession;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "classroom_id")
    private ClassRoom classRoom;

    @Column
    private Integer grade; // Khối lớp (10, 11, 12) — dùng khi xếp lịch theo khối

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "subject_id", nullable = false)
    private Subject subject;

    @Enumerated(EnumType.STRING)
    @Column(name = "exam_type", nullable = false, length = 20)
    private ExamType examType;

    @Column(name = "exam_date", nullable = false)
    private LocalDate examDate;

    @Column(name = "start_time", nullable = false)
    private LocalTime startTime;

    @Column(nullable = false)
    private Integer duration; // in minutes

    @Column(name = "room_number", length = 50)
    private String roomNumber;

    @Column(name = "end_time")
    private LocalTime endTime;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private ExamStatus status = ExamStatus.UPCOMING;

    @Column(length = 500)
    private String note;

    @Column(name = "academic_year", nullable = false, length = 20)
    private String academicYear;

    @Column(nullable = false)
    private Integer semester;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "school_id", nullable = false)
    private School school;

    @Column(name = "created_at", nullable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at")
    private Instant updatedAt;

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = Instant.now();
    }
}
