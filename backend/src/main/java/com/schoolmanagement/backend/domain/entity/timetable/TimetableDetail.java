package com.schoolmanagement.backend.domain.entity.timetable;

import com.schoolmanagement.backend.domain.entity.classes.ClassRoom;
import com.schoolmanagement.backend.domain.entity.classes.Subject;
import com.schoolmanagement.backend.domain.entity.teacher.Teacher;

import jakarta.persistence.*;
import lombok.*;

import java.time.DayOfWeek;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "timetable_details",
        uniqueConstraints = {
                // 1 lớp chỉ có 1 tiết tại 1 slot trong 1 ngày
                @UniqueConstraint(name = "uk_detail_class_day_slot",
                        columnNames = {"timetable_id", "classroom_id", "day_of_week", "slot_index"}),
                // 1 giáo viên chỉ dạy 1 lớp tại 1 slot trong 1 ngày
                @UniqueConstraint(name = "uk_detail_teacher_day_slot",
                        columnNames = {"timetable_id", "teacher_id", "day_of_week", "slot_index"})
        },
        indexes = {
                @Index(name = "idx_detail_timetable", columnList = "timetable_id"),
                @Index(name = "idx_detail_class", columnList = "classroom_id"),
                @Index(name = "idx_detail_teacher", columnList = "teacher_id")
        })
public class TimetableDetail {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "timetable_id", nullable = false)
    @com.fasterxml.jackson.annotation.JsonIgnore
    private Timetable timetable;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "classroom_id", nullable = false)
    private ClassRoom classRoom;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "subject_id", nullable = false)
    private Subject subject;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "teacher_id", nullable = true)
    private Teacher teacher;

    @Enumerated(EnumType.STRING)
    @Column(name = "day_of_week", nullable = false)
    private DayOfWeek dayOfWeek; // JAVA TIME DayOfWeek (MONDAY..SUNDAY)

    @Column(name = "slot_index", nullable = false)
    private int slotIndex; // 1-5 (Morning), 6-10 (Afternoon) or 1-10 continuous

    @Column(name = "is_fixed", nullable = false)
    @Builder.Default
    private boolean isFixed = false; // e.g., Flag Ceremony
}
