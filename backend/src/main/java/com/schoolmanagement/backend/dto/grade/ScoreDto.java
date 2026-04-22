package com.schoolmanagement.backend.dto.grade;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class ScoreDto {
    private String subjectId;
    private String subjectName;
    private List<Double> regularScores;
    private Double midtermScore;
    private Double finalScore;
    private Double averageScore;
}
