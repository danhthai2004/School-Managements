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
import java.util.*;
import java.util.stream.Collectors;
import com.schoolmanagement.backend.domain.entity.attendance.Attendance;

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
        LocalDate yesterday = today.minusDays(1);

        List<ClassRoom> classRooms = classRoomRepository.findAllBySchoolOrderByGradeAscNameAsc(school);
        int totalProcessed = 0;

        // Lấy sẵn TẤT CẢ snapshot hôm nay của toàn trường (để skip duplicate)
        List<RiskMetricsSnapshot> allTodaySnapshots = snapshotRepository.findAllBySchoolAndSnapshotDate(school, today);
        Set<UUID> alreadyProcessedStudentIds = allTodaySnapshots.stream()
                .map(s -> s.getStudent().getId())
                .collect(Collectors.toSet());

        for (ClassRoom classRoom : classRooms) {
            List<ClassEnrollment> enrollments = classEnrollmentRepository.findAllByClassRoom(classRoom);
            if (enrollments.isEmpty()) continue;

            List<Student> students = enrollments.stream().map(ClassEnrollment::getStudent).toList();
            List<UUID> studentIds = students.stream().map(Student::getId).toList();

            // --- BATCH FETCHING ---
            // 1. Attendance trong 30 ngày qua cho cả lớp
            List<Attendance> classAttendances = 
                attendanceRepository.findAllByClassRoomAndDateBetween(classRoom, thirtyDaysAgo, today);

            // 2. Điểm số cho cả lớp
            List<Grade> classGrades = gradeRepository.findAllByStudentIdIn(studentIds);

            // 3. Snapshot cũ (trong 14 ngày qua để tìm previous GPA)
            List<RiskMetricsSnapshot> pastSnapshots = snapshotRepository.findByClassRoomAndSnapshotDateBetween(
                classRoom, today.minusDays(14), yesterday);

            // Group data by studentId in memory
            Map<UUID, List<Attendance>> attendanceByStudent = classAttendances.stream()
                .collect(Collectors.groupingBy(a -> a.getStudent().getId()));
            
            Map<UUID, List<Grade>> gradesByStudent = classGrades.stream()
                .collect(Collectors.groupingBy(g -> g.getStudent().getId()));

            Map<UUID, List<RiskMetricsSnapshot>> snapshotsByStudent = pastSnapshots.stream()
                .collect(Collectors.groupingBy(s -> s.getStudent().getId()));

            List<RiskMetricsSnapshot> newSnapshots = new ArrayList<>();

            for (Student student : students) {
                if (alreadyProcessedStudentIds.contains(student.getId())) {
                    continue; // Skip nếu đã có
                }

                List<Attendance> studentAttendances = attendanceByStudent.getOrDefault(student.getId(), List.of());
                List<Grade> studentGrades = gradesByStudent.getOrDefault(student.getId(), List.of());
                
                // Lấy snapshot gần nhất trước today
                BigDecimal previousGpa = null;
                List<RiskMetricsSnapshot> studentSnapshots = snapshotsByStudent.getOrDefault(student.getId(), List.of());
                if (!studentSnapshots.isEmpty()) {
                    // Sort descending by date
                    studentSnapshots.sort((s1, s2) -> s2.getSnapshotDate().compareTo(s1.getSnapshotDate()));
                    previousGpa = studentSnapshots.get(0).getCurrentGpa();
                }

                RiskMetricsSnapshot snapshot = buildSnapshotInMemory(student, classRoom, school,
                        today, sevenDaysAgo, thirtyDaysAgo, studentAttendances, studentGrades, previousGpa);
                
                newSnapshots.add(snapshot);
                alreadyProcessedStudentIds.add(student.getId());
                totalProcessed++;
            }

            if (!newSnapshots.isEmpty()) {
                snapshotRepository.saveAll(newSnapshots);
            }
        }

        log.info("[RiskAggregator] Trường {}: Đã tạo {} snapshot(s).", school.getId(), totalProcessed);
    }

    private RiskMetricsSnapshot buildSnapshotInMemory(Student student, ClassRoom classRoom, School school,
            LocalDate today, LocalDate sevenDaysAgo, LocalDate thirtyDaysAgo,
            List<Attendance> attendances,
            List<Grade> grades, BigDecimal previousGpa) {
        
        // Filter attendances for 7d
        List<Attendance> attendances7d = attendances.stream()
            .filter(a -> !a.getAttendanceDate().isBefore(sevenDaysAgo) && !a.getAttendanceDate().isAfter(today))
            .toList();

        // === Attendance metrics (7 ngày) ===
        long absentUnexcused7d = attendances7d.stream().filter(a -> a.getStatus() == AttendanceStatus.ABSENT_UNEXCUSED).count();
        long absentExcused7d = attendances7d.stream().filter(a -> a.getStatus() == AttendanceStatus.ABSENT_EXCUSED).count();
        long lateCount7d = attendances7d.stream().filter(a -> a.getStatus() == AttendanceStatus.LATE).count();
        long totalSessions7d = attendances7d.size();

        // === Attendance rate (30 ngày) ===
        long total30d = attendances.size();
        long present30d = attendances.stream().filter(a -> a.getStatus() == AttendanceStatus.PRESENT).count();
        BigDecimal attendanceRate30d = total30d > 0
                ? BigDecimal.valueOf(present30d).multiply(BigDecimal.valueOf(100))
                        .divide(BigDecimal.valueOf(total30d), 2, RoundingMode.HALF_UP)
                : null;

        // === Academic metrics ===
        BigDecimal currentGpa = calculateAverageGpa(grades);

        List<String> failingSubjectsList = grades.stream()
                .filter(g -> g.getAverageScore() != null && g.getAverageScore().compareTo(BigDecimal.valueOf(5)) < 0)
                .map(g -> g.getSubject().getName()) // Lấy tên môn học
                .distinct()
                .toList();

        int failingCount = failingSubjectsList.size();
        String failingDetail = String.join(", ", failingSubjectsList);

        // === Previous snapshot (cho trend) ===
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
                .failingSubjectsDetail(failingDetail)
                .build();
    }

    private BigDecimal calculateAverageGpa(List<Grade> grades) {
        if (grades.isEmpty())
            return null;
        List<BigDecimal> scores = grades.stream()
                .map(Grade::getAverageScore)
                .filter(Objects::nonNull)
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
