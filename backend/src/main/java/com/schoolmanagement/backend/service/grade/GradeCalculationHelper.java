package com.schoolmanagement.backend.service.grade;

import com.schoolmanagement.backend.domain.entity.grade.Grade;
import com.schoolmanagement.backend.domain.entity.grade.GradingConfig;
import com.schoolmanagement.backend.domain.entity.grade.RegularScore;
import com.schoolmanagement.backend.repo.grade.GradingConfigRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Shared helper for calculating grade averages.
 *
 * Replaces the duplicate calculateAverage() methods in GradeService and GradeImportService.
 * Reads weight configuration from DB; falls back to defaults (1/2/3) when no config exists.
 */
@Component
@RequiredArgsConstructor
public class GradeCalculationHelper {

    private final GradingConfigRepository gradingConfigRepository;

    /**
     * Calculate weighted average for a Grade entity using the school's grading config.
     *
     * @param grade    the grade to calculate average for
     * @param schoolId the school ID to look up weight config
     * @return the weighted average, or null if no scores are present
     */
    public BigDecimal calculateAverage(Grade grade, UUID schoolId) {
        GradingConfig config = gradingConfigRepository.findBySchoolId(schoolId)
                .orElse(GradingConfig.defaultConfig());
        return calculateAverage(grade, config);
    }

    /**
     * Calculate weighted average using an explicit config.
     */
    public BigDecimal calculateAverage(Grade grade, GradingConfig config) {
        double total = 0;
        int weight = 0;

        int regularW = config.getRegularWeight();
        int midtermW = config.getMidtermWeight();
        int finalW = config.getFinalWeight();

        // Regular scores (each multiplied by regularWeight)
        if (grade.getRegularScores() != null) {
            for (RegularScore regularScore : grade.getRegularScores()) {
                if (regularScore.getScoreValue() != null) {
                    total += regularScore.getScoreValue().doubleValue() * regularW;
                    weight += regularW;
                }
            }
        }

        // Mid-term (multiplied by midtermWeight)
        if (grade.getMidtermScore() != null) {
            total += grade.getMidtermScore().doubleValue() * midtermW;
            weight += midtermW;
        }

        // Final (multiplied by finalWeight)
        if (grade.getFinalScore() != null) {
            total += grade.getFinalScore().doubleValue() * finalW;
            weight += finalW;
        }

        if (weight == 0) return null;
        return BigDecimal.valueOf(Math.round((total / weight) * 10.0) / 10.0);
    }

    /**
     * Classify student performance based on average score.
     * Uses Vietnamese education system categories.
     */
    public String classifyPerformance(BigDecimal averageScore) {
        if (averageScore == null) return null;
        double avg = averageScore.doubleValue();
        if (avg >= 8.0) return "Giỏi";
        if (avg >= 6.5) return "Khá";
        if (avg >= 5.0) return "Trung bình";
        if (avg >= 3.5) return "Yếu";
        return "Kém";
    }
}
