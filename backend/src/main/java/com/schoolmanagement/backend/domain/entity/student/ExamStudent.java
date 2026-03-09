package com.schoolmanagement.backend.domain.entity.student;

import com.schoolmanagement.backend.domain.entity.classes.ExamRoom;

import com.schoolmanagement.backend.domain.attendance.AttendanceStatus;
import jakarta.persistence.*;
import lombok.*;
import java.util.UUID;

/**
 * Thí sinh được phân bổ vào phòng thi.
 * Hỗ trợ điểm danh (attendance) và lưu điểm (score) sau khi thi.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "exam_students", indexes = {
        @Index(name = "idx_exam_student_room", columnList = "exam_room_id"),
        @Index(name = "idx_exam_student_student", columnList = "student_id")
})
public class ExamStudent {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "exam_room_id", nullable = false)
    private ExamRoom examRoom;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", nullable = false)
    private Student student;

    @Enumerated(EnumType.STRING)
    @Column(name = "attendance_status", length = 20)
    private AttendanceStatus attendanceStatus;

    @Column
    private Double score;
}
