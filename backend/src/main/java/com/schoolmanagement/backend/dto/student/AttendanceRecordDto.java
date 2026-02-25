package com.schoolmanagement.backend.dto.student;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AttendanceRecordDto {
    private String date;
    private String status; // 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED'
    private String note;
}
