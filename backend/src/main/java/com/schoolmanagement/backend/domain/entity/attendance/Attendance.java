package com.schoolmanagement.backend.domain.entity.attendance;

import com.schoolmanagement.backend.domain.attendance.AttendanceStatus;
import jakarta.persistence.*;
import com.schoolmanagement.backend.domain.entity.student.Student;
import com.schoolmanagement.backend.domain.entity.teacher.Teacher;
import com.schoolmanagement.backend.domain.entity.classes.ClassRoom;
import com.schoolmanagement.backend.domain.entity.classes.Subject;
import lombok.*;

import java.time.LocalDate;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "attendance", indexes = {
        @Index(name = "idx_attendance_date_class", columnList = "date, classroom_id"),
        @Index(name = "idx_attendance_student", columnList = "student_id")
})
public class Attendance {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", nullable = false)
    private Student student;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "classroom_id")
    private ClassRoom classRoom;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "subject_id", nullable = false)
    private Subject subject;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "teacher_id", nullable = true)
    private Teacher teacher;

    @Column(nullable = false)
    private LocalDate date;

    @Column(name = "slot_index", nullable = false)
    private int slotIndex;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AttendanceStatus status;

    @Column(columnDefinition = "TEXT")
    private String remarks;
}
