package com.schoolmanagement.backend.dto.attendance;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Lightweight daily slot status for subject teachers.
 * Used by mobile app to show "Đã/Chưa điểm danh" per period without requiring homeroom permission.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TeacherDailySlotStatusDto {
    private String date;
    private List<Integer> finalizedSlots;
}

