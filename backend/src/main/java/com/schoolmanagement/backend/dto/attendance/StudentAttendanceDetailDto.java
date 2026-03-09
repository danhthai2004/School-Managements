package com.schoolmanagement.backend.dto.attendance;

import com.schoolmanagement.backend.domain.attendance.AttendanceStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudentAttendanceDetailDto {
    private String studentId;
    private String studentName;
    private List<AttendanceRecord> records;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AttendanceRecord {
        private String date;
        private int slotIndex;
        private String subjectName;
        private AttendanceStatus status;
        private String remarks;
    }
}
