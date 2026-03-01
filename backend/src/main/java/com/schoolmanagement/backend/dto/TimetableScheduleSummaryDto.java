package com.schoolmanagement.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Response DTO containing calculated schedule summary based on timetable
 * settings.
 * Used to display preview when school admin configures timetable settings.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TimetableScheduleSummaryDto {

    // School day timing
    private String arrivalTime; // Giờ đến trường (VD: 06:45)
    private String morningEndTime; // Tan học buổi sáng (VD: 11:15)
    private String afternoonEndTime; // Tan học buổi chiều (VD: 17:00)

    // Lunch break
    private String lunchBreakStart; // Nghỉ trưa bắt đầu (VD: 11:15)
    private String lunchBreakEnd; // Nghỉ trưa kết thúc (VD: 13:00)
    private int lunchBreakDurationMinutes; // Tổng thời gian nghỉ trưa (phút)

    // Total learning time
    private int totalLearningMinutesPerDay; // Tổng thời gian học/ngày (phút)

    // Slot details for preview
    private List<SlotTimeDto> morningSlots;
    private List<SlotTimeDto> afternoonSlots;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SlotTimeDto {
        private int slotIndex;
        private String startTime;
        private String endTime;
        private boolean isAfterLongBreak;
    }
}
