package com.schoolmanagement.backend.dto.grade;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * DTO summarizing grade entry progress for the admin dashboard.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GradeEntryStatusDto {

    private int totalClasses;
    private int completedClasses;
    private int totalMidtermGrades;
    private int filledMidtermGrades;
    private int totalFinalGrades;
    private int filledFinalGrades;
    private double completionPercentage;
    private List<ClassEntryStatus> classStatuses;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ClassEntryStatus {
        private String classId;
        private String className;
        private int grade; // khối lớp
        private int totalSubjects;
        private int completedSubjects; 
        private int totalStudents;
        private int totalGradeEntries;  
        private int expectedGradeEntries; 
        private double completionPercentage;
        private boolean isLocked;
        private List<SubjectEntryStatus> subjects;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SubjectEntryStatus {
        private String subjectId;
        private String subjectName;
        private int totalStudents;
        private int txEntered;      // Students with at least one TX grade
        private int midtermEntered; // Students with Midterm grade
        private int finalEntered;   // Students with Final grade
        private double completionPercentage;
        private boolean isComplete;
    }
}
