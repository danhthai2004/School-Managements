package com.schoolmanagement.backend.domain.entity.attendance;

import com.schoolmanagement.backend.domain.entity.student.Student;
import com.schoolmanagement.backend.domain.entity.classes.ClassRoom;
import com.schoolmanagement.backend.domain.entity.admin.School;
import com.schoolmanagement.backend.domain.entity.classes.Subject;
import com.schoolmanagement.backend.domain.entity.teacher.Teacher;

import com.schoolmanagement.backend.domain.attendance.AttendanceStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import com.fasterxml.jackson.annotation.JsonIgnore;
import java.util.UUID;

/**
 * Entity to track student attendance.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "attendances", indexes = {
        @Index(name = "idx_attendance_student", columnList = "student_id"),
        @Index(name = "idx_attendance_date", columnList = "attendance_date"),
        @Index(name = "idx_attendance_class", columnList = "classroom_id"),
        @Index(name = "idx_attendance_unique", columnList = "student_id, attendance_date", unique = true)
})
public class Attendance {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", nullable = false)
    private Student student;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "classroom_id", nullable = false)
    private ClassRoom classRoom;

    @Column(name = "attendance_date", nullable = false)
    private LocalDate attendanceDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AttendanceStatus status;

    @Column(length = 500)
    private String note;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "school_id")
    private School school;

    @Column(name = "recorded_by")
    private UUID recordedBy;

    // --- Fields added for Teacher Portal (fuuko branch) ---

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "subject_id")
    private Subject subject;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "teacher_id")
    private Teacher teacher;

    @Column(name = "slot_index")
    private Integer slotIndex;

    @Column(columnDefinition = "TEXT")
    private String remarks;

    @Column(name = "created_at", nullable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at")
    private Instant updatedAt;

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = Instant.now();
    }

    /**
     * Alias getter so fuuko-branch service code calling getDate() works
     * without renaming the column.
     */
    @Transient
    @JsonIgnore
    public LocalDate getDate() {
        return this.attendanceDate;
    }

    public void setDate(LocalDate date) {
        this.attendanceDate = date;
    }
}
