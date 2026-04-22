package com.schoolmanagement.backend.dto.attendance;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AttendanceRecordDto {
    private java.time.LocalDate date;
    private Integer slotIndex;
    private String subjectName;
    private String status; // 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED'
    private String note;
}
