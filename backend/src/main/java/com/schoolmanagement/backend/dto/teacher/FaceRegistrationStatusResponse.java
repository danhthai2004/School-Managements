package com.schoolmanagement.backend.dto.teacher;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * DTO for registration status of students' faces in a class.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class FaceRegistrationStatusResponse {

    private List<FaceRegistrationStatusDto> students;
    private int totalStudents;
    private int totalRegistered;
    private int totalUnregistered;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FaceRegistrationStatusDto {
        private String studentId;
        private String studentCode;
        private String studentName;
        private String avatarUrl;
        private boolean isRegistered;
        private int imageCount;
        private String lastUpdated;
    }
}
