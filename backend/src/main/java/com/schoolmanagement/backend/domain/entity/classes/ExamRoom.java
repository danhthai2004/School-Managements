package com.schoolmanagement.backend.domain.entity.classes;

import com.schoolmanagement.backend.domain.entity.exam.ExamSchedule;

import jakarta.persistence.*;
import lombok.*;
import java.util.UUID;

/**
 * Phòng thi thực tế được gán cho một lịch thi (ExamSchedule).
 * Capacity ở đây có thể khác capacity mặc định của Room.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "exam_rooms", indexes = {
        @Index(name = "idx_exam_room_schedule", columnList = "exam_schedule_id"),
        @Index(name = "idx_exam_room_room", columnList = "room_id")
})
public class ExamRoom {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "exam_schedule_id", nullable = false)
    private ExamSchedule examSchedule;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "room_id", nullable = false)
    private Room room;

    @Column(nullable = false)
    private Integer capacity;
}
