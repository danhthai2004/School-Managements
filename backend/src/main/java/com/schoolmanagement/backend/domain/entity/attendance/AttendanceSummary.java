package com.schoolmanagement.backend.domain.entity.attendance;

import com.schoolmanagement.backend.domain.entity.student.Student;
import com.schoolmanagement.backend.domain.entity.classes.ClassRoom;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "attendance_summary", uniqueConstraints = {
        @UniqueConstraint(columnNames = { "student_id", "class_id", "academic_year", "semester" })
})
public class AttendanceSummary {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", nullable = false)
    private Student student;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "class_id", nullable = false)
    private ClassRoom classRoom;

    @Column(name = "academic_year", nullable = false)
    private String academicYear;

    @Column(nullable = false)
    private int semester;

    @Column(name = "total_sessions")
    @Builder.Default
    private int totalSessions = 0;

    @Column(name = "present_count")
    @Builder.Default
    private int presentCount = 0;

    @Column(name = "absent_count")
    @Builder.Default
    private int absentCount = 0;

    @Column(name = "late_count")
    @Builder.Default
    private int lateCount = 0;

    @Column(name = "excused_count")
    @Builder.Default
    private int excusedCount = 0;

    @Column(name = "attendance_rate", precision = 5, scale = 2)
    private BigDecimal attendanceRate; // Percentage

    @Column(name = "last_updated")
    @Builder.Default
    private Instant lastUpdated = Instant.now();
}
