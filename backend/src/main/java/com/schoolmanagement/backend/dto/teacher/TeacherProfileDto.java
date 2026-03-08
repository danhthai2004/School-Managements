package com.schoolmanagement.backend.dto.teacher;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TeacherProfileDto {
    @com.fasterxml.jackson.annotation.JsonProperty("isHomeroomTeacher")
    private boolean isHomeroomTeacher;
    private String homeroomClassId;
    private String homeroomClassName;
    private List<AssignedClassDto> assignedClasses;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AssignedClassDto {
        private String classId;
        private String className;
        private String subjectId;
        private String subjectName;
    }
}
