package com.schoolmanagement.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TimetableSettingsDto {
    
    // Period configuration
    private int periodsPerMorning;
    private int periodsPerAfternoon;
    private int periodDurationMinutes;
    
    // Time configuration
    private String morningStartTime;
    private String afternoonStartTime;
    
    // Break configuration
    private int shortBreakMinutes;
    private int longBreakMinutes;
    private int longBreakAfterPeriod;
}
