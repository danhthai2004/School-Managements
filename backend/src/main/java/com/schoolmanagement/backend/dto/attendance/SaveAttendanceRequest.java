package com.schoolmanagement.backend.dto.attendance;

import com.schoolmanagement.backend.domain.attendance.AttendanceStatus;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SaveAttendanceRequest {
    private LocalDate date;
    private int slotIndex;
    private List<AttendanceRecord> records;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AttendanceRecord {
        private String studentId;
        private AttendanceStatus status;
        private String remarks;
    }
}
