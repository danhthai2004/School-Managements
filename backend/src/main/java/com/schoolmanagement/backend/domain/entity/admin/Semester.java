package com.schoolmanagement.backend.domain.entity.admin;

import com.schoolmanagement.backend.domain.admin.SemesterStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Học kỳ (Học kỳ 1, Học kỳ 2).
 * Là phân đoạn thời gian trong một AcademicYear.
 * Là "cha" của Grades, Timetables, ExamSessions, Attendance, v.v.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "semesters", indexes = {
        @Index(name = "idx_semester_academic_year", columnList = "academic_year_id"),
        @Index(name = "idx_semester_school", columnList = "school_id"),
        @Index(name = "idx_semester_status", columnList = "status")
}, uniqueConstraints = {
        @UniqueConstraint(name = "uk_semester_name_year", columnNames = {"name", "academic_year_id"})
})
public class Semester {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 50)
    private String name; // "Học kỳ 1", "Học kỳ 2"

    @Column(name = "semester_number", nullable = false)
    private int semesterNumber; // 1 or 2

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "academic_year_id", nullable = false)
    private AcademicYear academicYear;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "school_id", nullable = false)
    private School school;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    @Column(name = "grade_deadline")
    private LocalDate gradeDeadline; // Hạn cuối nhập điểm

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private SemesterStatus status = SemesterStatus.UPCOMING;

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
