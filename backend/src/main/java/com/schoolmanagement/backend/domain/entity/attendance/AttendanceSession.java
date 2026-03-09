package com.schoolmanagement.backend.domain.entity.attendance;

import com.schoolmanagement.backend.domain.entity.admin.School;
import com.schoolmanagement.backend.domain.entity.classes.ClassRoom;
import com.schoolmanagement.backend.domain.entity.teacher.Teacher;
import com.schoolmanagement.backend.domain.entity.classes.Subject;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "attendance_sessions", indexes = {
        @Index(name = "idx_session_class_date", columnList = "class_id, session_date"),
        @Index(name = "idx_session_teacher", columnList = "teacher_id")
})
public class AttendanceSession {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "school_id", nullable = false)
    private School school;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "class_id", nullable = false)
    private ClassRoom classRoom;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "teacher_id", nullable = false)
    private Teacher teacher;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "subject_id")
    private Subject subject;

    @Column(name = "session_date", nullable = false)
    private LocalDate sessionDate;

    @Column(name = "slot_index", nullable = false)
    private Integer slotIndex;

    @Column(name = "academic_year", nullable = false)
    private String academicYear;

    @Column(nullable = false)
    private int semester;

    @Column(name = "lesson_content", columnDefinition = "TEXT")
    private String lessonContent; // Nội dung bài dạy (Sổ đầu bài)

    @Column(columnDefinition = "TEXT")
    private String homework; // Bài tập về nhà

    @Column(columnDefinition = "TEXT")
    private String note; // Ghi chú chung cho tiết học

    @Column(name = "created_at", nullable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at")
    private Instant updatedAt;
}
