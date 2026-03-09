package com.schoolmanagement.backend.domain.entity.classes;

import com.schoolmanagement.backend.domain.entity.admin.School;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalTime;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "lesson_slots")
public class LessonSlot {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String name; // e.g., "Tiết 1", "Tiết 2"

    @Column(name = "start_time", nullable = false)
    private LocalTime startTime;

    @Column(name = "end_time", nullable = false)
    private LocalTime endTime;

    @Column(name = "slot_index", nullable = false)
    private int slotIndex; // 1, 2, 3... used for ordering and algorithm

    @Column(name = "is_morning", nullable = false)
    private boolean isMorning;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "school_id", nullable = false)
    private School school;
}
