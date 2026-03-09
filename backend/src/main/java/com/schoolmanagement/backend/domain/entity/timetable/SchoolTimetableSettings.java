package com.schoolmanagement.backend.domain.entity.timetable;

import com.schoolmanagement.backend.domain.entity.admin.School;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "school_timetable_settings")
public class SchoolTimetableSettings {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "school_id", nullable = false, unique = true)
    private School school;

    // Period configuration
    @Column(name = "periods_per_morning", nullable = false)
    @Builder.Default
    private int periodsPerMorning = 5; // Số tiết buổi sáng (max 5)

    @Column(name = "periods_per_afternoon", nullable = false)
    @Builder.Default
    private int periodsPerAfternoon = 5; // Số tiết buổi chiều (max 5)

    @Column(name = "period_duration_minutes", nullable = false)
    @Builder.Default
    private int periodDurationMinutes = 45; // Thời lượng mỗi tiết (phút)

    // Time configuration (stored as "HH:mm")
    @Column(name = "morning_start_time", nullable = false, length = 5)
    @Builder.Default
    private String morningStartTime = "07:00"; // Giờ bắt đầu buổi sáng

    @Column(name = "afternoon_start_time", nullable = false, length = 5)
    @Builder.Default
    private String afternoonStartTime = "13:00"; // Giờ bắt đầu buổi chiều

    // Break configuration
    @Column(name = "short_break_minutes", nullable = false)
    @Builder.Default
    private int shortBreakMinutes = 5; // Nghỉ giữa các tiết

    @Column(name = "long_break_minutes", nullable = false)
    @Builder.Default
    private int longBreakMinutes = 20; // Giờ ra chơi chung

    @Column(name = "long_break_after_period", nullable = false)
    @Builder.Default
    private int longBreakAfterPeriod = 2; // Ra chơi sau tiết mấy (sáng/chiều)
}
