package com.schoolmanagement.backend.service.grade;

import com.schoolmanagement.backend.domain.entity.admin.Semester;
import com.schoolmanagement.backend.domain.entity.auth.User;
import com.schoolmanagement.backend.domain.entity.grade.Grade;
import com.schoolmanagement.backend.domain.entity.grade.GradeEntryLock;
import com.schoolmanagement.backend.domain.entity.grade.GradeHistory;
import com.schoolmanagement.backend.domain.entity.grade.RegularScore;
import com.schoolmanagement.backend.repo.grade.GradeEntryLockRepository;
import com.schoolmanagement.backend.repo.grade.GradeHistoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.*;

/**
 * Helper to handle grade entry governance: deadline validation, locking, and audit logs.
 */
@Component
@RequiredArgsConstructor
public class GradeGovernanceHelper {

    private final GradeEntryLockRepository gradeEntryLockRepository;
    private final GradeHistoryRepository gradeHistoryRepository;

    /**
     * Validate if grade entry is currently allowed for a given class and semester.
     * Enforces the GradeEntryLock override, then checks the semester's gradeDeadline.
     */
    public void validateGradeEntryAllowed(UUID classId, Semester semester) {
        Optional<GradeEntryLock> lockOpt = gradeEntryLockRepository.findByClassRoomIdAndSemesterId(classId, semester.getId());

        if (lockOpt.isPresent()) {
            GradeEntryLock lock = lockOpt.get();
            if (lock.isLocked()) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Nhập điểm cho lớp này đã bị khóa bởi Admin.");
            } else {
                // If explicitly unlocked by Admin, it bypasses the deadline.
                return;
            }
        }

        // Check global deadline
        if (semester.getGradeDeadline() != null && LocalDate.now().isAfter(semester.getGradeDeadline())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, 
                    "Đã quá hạn nhập điểm (" + semester.getGradeDeadline() + ") cho học kỳ này. Vui lòng liên hệ Admin để mở khóa.");
        }
    }

    /**
     * Record history if there are changes between old and new scores.
     */
    public void recordHistoryIfChanged(Grade grade, 
                                       Map<Integer, BigDecimal> oldRegMap, 
                                       BigDecimal oldMid, 
                                       BigDecimal oldFinal, 
                                       User changedBy, 
                                       String reason) {
        
        List<GradeHistory> histories = new ArrayList<>();
        
        // Helper to compare BigDecimals ignoring scale
        java.util.function.BiPredicate<BigDecimal, BigDecimal> isDifferent = (a, b) -> {
            if (a == null && b == null) return false;
            if (a == null || b == null) return true;
            return a.compareTo(b) != 0;
        };
        
        // Track regular scores
        Map<Integer, BigDecimal> newRegMap = new HashMap<>();
        if (grade.getRegularScores() != null) {
            for (RegularScore rs : grade.getRegularScores()) {
                newRegMap.put(rs.getScoreIndex(), rs.getScoreValue());
            }
        }

        // Check all keys in both maps
        Set<Integer> allIndices = new HashSet<>();
        allIndices.addAll(oldRegMap.keySet());
        allIndices.addAll(newRegMap.keySet());

        for (Integer index : allIndices) {
            BigDecimal oldVal = oldRegMap.get(index);
            BigDecimal newVal = newRegMap.get(index);
            
            if (isDifferent.test(oldVal, newVal)) {
                histories.add(createHistory(grade, "TX" + index, oldVal, newVal, changedBy, reason));
            }
        }

        // Track midterm
        if (isDifferent.test(oldMid, grade.getMidtermScore())) {
            histories.add(createHistory(grade, "Giữa kỳ", oldMid, grade.getMidtermScore(), changedBy, reason));
        }

        // Track final
        if (isDifferent.test(oldFinal, grade.getFinalScore())) {
            histories.add(createHistory(grade, "Cuối kỳ", oldFinal, grade.getFinalScore(), changedBy, reason));
        }

        if (!histories.isEmpty()) {
            gradeHistoryRepository.saveAll(histories);
        }
    }

    private GradeHistory createHistory(Grade grade, String field, BigDecimal oldVal, BigDecimal newVal, User changedBy, String reason) {
        return GradeHistory.builder()
                .grade(grade)
                .fieldChanged(field)
                .oldValue(oldVal != null ? oldVal.toString() : "")
                .newValue(newVal != null ? newVal.toString() : "")
                .changedBy(changedBy)
                .changedAt(Instant.now())
                .reason(reason != null ? reason : "Cập nhật qua tính năng Nhập điểm")
                .build();
    }
}
