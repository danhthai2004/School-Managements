package com.schoolmanagement.backend.dto.timetable;

import lombok.Builder;
import lombok.Data;
import java.util.List;

@Data
@Builder
public class StudentTimetableDto {
    private String classId;
    private String className;
    private String academicYear;
    private int semester;
    private List<TimetableSlotDto> slots;
}
