package com.schoolmanagement.backend.service.risk;

import com.schoolmanagement.backend.domain.attendance.AttendanceStatus;
import com.schoolmanagement.backend.domain.entity.admin.School;
import com.schoolmanagement.backend.domain.entity.classes.ClassEnrollment;
import com.schoolmanagement.backend.domain.entity.classes.ClassRoom;
import com.schoolmanagement.backend.domain.entity.grade.Grade;
import com.schoolmanagement.backend.domain.entity.risk.RiskMetricsSnapshot;
import com.schoolmanagement.backend.domain.entity.student.Student;
import com.schoolmanagement.backend.domain.risk.RiskTrend;
import com.schoolmanagement.backend.repo.attendance.AttendanceRepository;
import com.schoolmanagement.backend.repo.classes.ClassEnrollmentRepository;
import com.schoolmanagement.backend.repo.classes.ClassRoomRepository;
import com.schoolmanagement.backend.repo.grade.GradeRepository;
import com.schoolmanagement.backend.repo.risk.RiskMetricsSnapshotRepository;
import com.schoolmanagement.backend.repo.admin.SchoolRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;

/**
 * Nightly Batch Job: Tổng hợp dữ liệu điểm số + chuyên cần vào bảng
 * RiskMetricsSnapshot.
 *
 * Chạy vào lúc 1:00 sáng mỗi ngày.
 * Nếu phát hiện rule nghiêm trọng (HS vắng > 3 buổi liên tục không phép),
 * sẽ kích hoạt cảnh báo tức thì qua NotificationService.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class NightlyDataAggregatorService {

    private final SchoolRepository schoolRepository;
    private final ClassRoomRepository classRoomRepository;
    private final ClassEnrollmentRepository classEnrollmentRepository;
    private final AttendanceRepository attendanceRepository;
    private final GradeRepository gradeRepository;
    private final RiskMetricsSnapshotRepository snapshotRepository;

    /**
     * Chạy tự động lúc 1:00 sáng hàng ngày.
     * Có thể gọi thủ công qua API trigger.
     */
    @Scheduled(cron = "0 0 1 * * *")
    @Transactional
    public void runNightlyAggregation() {
        log.info("[RiskAggregator] Bắt đầu tổng hợp dữ liệu rủi ro nightly...");
        List<School> schools = schoolRepository.findAll();
        for (School school : schools) {
            try {
                aggregateForSchool(school);
            } catch (Exception e) {
                log.error("[RiskAggregator] Lỗi khi tổng hợp cho trường {}: {}",
                        school.getId(), e.getMessage(), e);
            }
        }
        log.info("[RiskAggregator] Hoàn tất tổng hợp dữ liệu rủi ro.");
    }

    /**
     * Tổng hợp cho 1 trường cụ thể (có thể gọi từ API trigger).
     */
    @Transactional
    public void aggregateForSchool(School school) {
        LocalDate today = LocalDate.now();
        LocalDate sevenDaysAgo = today.minusDays(7);
        LocalDate thirtyDaysAgo = today.minusDays(30);

        List<ClassRoom> classRooms = classRoomRepository.findAllBySchoolOrderByGradeAscNameAsc(school);
        int totalProcessed = 0;

        for (ClassRoom classRoom : classRooms) {
            List<ClassEnrollment> enrollments = classEnrollmentRepository.findAllByClassRoom(classRoom);

            for (ClassEnrollment enrollment : enrollments) {
                Student student = enrollment.getStudent();

                // Kiểm tra xem snapshot hôm nay đã tồn tại chưa
                if (snapshotRepository.findByStudentAndSnapshotDate(student, today).isPresent()) {
                    continue; // Skip nếu đã có
                }

                RiskMetricsSnapshot snapshot = buildSnapshot(student, classRoom, school,
                        today, sevenDaysAgo, thirtyDaysAgo);
                snapshotRepository.save(snapshot);
                totalProcessed++;
            }
        }

        log.info("[RiskAggregator] Trường {}: Đã tạo {} snapshot(s).", school.getId(), totalProcessed);
    }

    private RiskMetricsSnapshot buildSnapshot(Student student, ClassRoom classRoom, School school,
            LocalDate today, LocalDate sevenDaysAgo, LocalDate thirtyDaysAgo) {
        // === Attendance metrics (7 ngày) ===
        long absentUnexcused7d = attendanceRepository.countByStudentAndDateRangeAndStatus(
                student, sevenDaysAgo, today, AttendanceStatus.ABSENT_UNEXCUSED);
        long absentExcused7d = attendanceRepository.countByStudentAndDateRangeAndStatus(
                student, sevenDaysAgo, today, AttendanceStatus.ABSENT_EXCUSED);
        long lateCount7d = attendanceRepository.countByStudentAndDateRangeAndStatus(
                student, sevenDaysAgo, today, AttendanceStatus.LATE);
        long totalSessions7d = attendanceRepository.countByStudentAndDateRange(
                student, sevenDaysAgo, today);

        // === Attendance rate (30 ngày) ===
        long total30d = attendanceRepository.countByStudentAndDateRange(student, thirtyDaysAgo, today);
        long present30d = attendanceRepository.countByStudentAndDateRangeAndStatus(
                student, thirtyDaysAgo, today, AttendanceStatus.PRESENT);
        BigDecimal attendanceRate30d = total30d > 0
                ? BigDecimal.valueOf(present30d).multiply(BigDecimal.valueOf(100))
                        .divide(BigDecimal.valueOf(total30d), 2, RoundingMode.HALF_UP)
                : null;

        // === Academic metrics ===
        List<Grade> grades = gradeRepository.findAllByStudent(student);
        BigDecimal currentGpa = calculateAverageGpa(grades);
        int failingCount = (int) grades.stream()
                .filter(g -> g.getAverageScore() != null && g.getAverageScore().compareTo(BigDecimal.valueOf(5)) < 0)
                .count();

        // === Previous snapshot (cho trend) ===
        BigDecimal previousGpa = snapshotRepository.findPreviousSnapshot(student, today)
                .map(RiskMetricsSnapshot::getCurrentGpa)
                .orElse(null);

        RiskTrend gpaTrend = calculateTrend(currentGpa, previousGpa);

        return RiskMetricsSnapshot.builder()
                .student(student)
                .classRoom(classRoom)
                .school(school)
                .snapshotDate(today)
                .absentUnexcused7d((int) absentUnexcused7d)
                .absentExcused7d((int) absentExcused7d)
                .lateCount7d((int) lateCount7d)
                .totalSessions7d((int) totalSessions7d)
                .attendanceRate30d(attendanceRate30d)
                .currentGpa(currentGpa)
                .previousGpa(previousGpa)
                .gpaTrend(gpaTrend)
                .failingSubjectsCount(failingCount)
                .build();
    }

    private BigDecimal calculateAverageGpa(List<Grade> grades) {
        if (grades.isEmpty())
            return null;
        List<BigDecimal> scores = grades.stream()
                .map(Grade::getAverageScore)
                .filter(java.util.Objects::nonNull)
                .toList();
        if (scores.isEmpty())
            return null;
        BigDecimal sum = scores.stream().reduce(BigDecimal.ZERO, BigDecimal::add);
        return sum.divide(BigDecimal.valueOf(scores.size()), 2, RoundingMode.HALF_UP);
    }

    private RiskTrend calculateTrend(BigDecimal current, BigDecimal previous) {
        if (current == null || previous == null)
            return RiskTrend.STABLE;
        int cmp = current.compareTo(previous);
        if (cmp > 0)
            return RiskTrend.IMPROVING;
        if (cmp < 0) {
            BigDecimal diff = previous.subtract(current);
            return diff.compareTo(BigDecimal.valueOf(1.0)) >= 0 ? RiskTrend.CRITICAL : RiskTrend.DECLINING;
        }
        return RiskTrend.STABLE;
    }
}
