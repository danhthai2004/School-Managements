package com.schoolmanagement.backend.dto.teacher;

import com.schoolmanagement.backend.domain.AttendanceStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DailyAttendanceSummaryDto {
    private String classroomName;
    private String date;
    private boolean isFinalized;
    private List<StudentDailyAttendance> students;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StudentDailyAttendance {
        private String studentId;
        private String studentName;
        // Map slot index (1-10) to status
        private Map<Integer, AttendanceStatus> slotTheStatus;
    }
}
