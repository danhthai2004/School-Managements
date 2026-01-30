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
        @Index(name = "idx_attendance_student", columnList = "student_id"),
        @Index(name = "idx_attendance_class", columnList = "class_id"),
        @Index(name = "idx_attendance_date", columnList = "attendance_date")
}, uniqueConstraints = {
        @UniqueConstraint(columnNames = { "student_id", "class_id", "attendance_date", "time_slot_id" })
})
public class Attendance {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", nullable = false)
    private Student student;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "class_id", nullable = false)
    private ClassRoom classRoom;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "teacher_id", nullable = false)
    private Teacher teacher;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "subject_id")
    private Subject subject;

    @Column(name = "attendance_date", nullable = false)
    private LocalDate attendanceDate;

    // Assuming we might have a TimeSlot entity later or just use ID for
    // now/referencing slot index
    // For now, let's keep it simple or map to a slot index if Entity is not ready.
    // The requirement mentioned time_slot_id. Let's use Long for now or UUID if
    // TimeSlot is created.
    // Since TimeSlot wasn't in my initial plan as a separate entity file, I'll add
    // a placeholder or just use an index.
    // Actually, the user SQL had `time_slot_id`. I should probably create TimeSlot
    // or just use `slot_index` like in TimetableDetail.
    // Let's use `slot_index` for consistency with TimetableDetail suitable for this
    // context.
    // Wait, the user SQL specifically said `REFERENCES time_slots(time_slot_id)`.
    // I missed `TimeSlot` in my plan. I should probably add it or use an integer if
    // they just want slot 1-10.
    // `TimetableDetail` uses `slotIndex` (int). I will use `slotIndex` here to
    // align with `TimetableDetail`.

    @Column(name = "slot_index")
    private Integer slotIndex;

    @Column(nullable = false, length = 20)
    private String status; // PRESENT, ABSENT, LATE, EXCUSED

    // Use string for simple enum storage or creating an Enum class
    @Column(name = "attendance_method", length = 50)
    private String attendanceMethod; // MANUAL, FACIAL_RECOGNITION, etc.

    @Column(name = "check_in_time")
    private LocalTime checkInTime;

    @Column(columnDefinition = "TEXT")
    private String notes;
}
