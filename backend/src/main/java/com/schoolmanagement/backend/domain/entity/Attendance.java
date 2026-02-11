package com.schoolmanagement.backend.domain.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "attendance", indexes = {
                @Index(name = "idx_attendance_session", columnList = "session_id"),
                @Index(name = "idx_attendance_student", columnList = "student_id")
}, uniqueConstraints = {
                @UniqueConstraint(columnNames = { "session_id", "student_id" })
})
public class Attendance {
        @Id
        @GeneratedValue(strategy = GenerationType.UUID)
        private UUID id;

        @ManyToOne(fetch = FetchType.LAZY)
        @JoinColumn(name = "session_id", nullable = false)
        private AttendanceSession session;

        @ManyToOne(fetch = FetchType.LAZY)
        @JoinColumn(name = "student_id", nullable = false)
        private Student student;

        @Column(nullable = false, length = 20)
        private String status; // PRESENT, ABSENT, LATE, EXCUSED

        @Column(name = "attendance_method", length = 50)
        private String attendanceMethod; // MANUAL, FACIAL_RECOGNITION

        @Column(name = "check_in_time")
        private LocalTime checkInTime;

        @Column(columnDefinition = "TEXT")
        private String notes; // Ghi chú riêng cho học sinh
}
