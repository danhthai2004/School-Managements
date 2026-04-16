package com.schoolmanagement.backend.dto.grade;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ScoreDto {
    private String subjectId;
    private String subjectName;
    private java.util.List<Double> regularScores;
    private Double midtermScore;
    private Double finalScore;
    private Double averageScore;
}
