package com.schoolmanagement.backend.dto.attendance;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AttendanceRecordDto {
    private String date;
    private String status; // 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED'
    private String note;
}
