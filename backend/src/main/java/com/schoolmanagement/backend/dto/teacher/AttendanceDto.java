package com.schoolmanagement.backend.dto.teacher;

import com.schoolmanagement.backend.domain.AttendanceStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AttendanceDto {
    private String studentId;
    private String studentCode;
    private String studentName;
    private AttendanceStatus status;
    private String remarks;
}
