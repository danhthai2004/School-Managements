package com.schoolmanagement.backend.service.risk;

import com.schoolmanagement.backend.domain.entity.admin.School;
import com.schoolmanagement.backend.domain.entity.classes.ClassRoom;
import com.schoolmanagement.backend.domain.entity.risk.RiskAssessmentHistory;
import com.schoolmanagement.backend.domain.entity.risk.RiskMetricsSnapshot;
import com.schoolmanagement.backend.domain.entity.student.Student;
import com.schoolmanagement.backend.domain.risk.TeacherFeedbackStatus;
import com.schoolmanagement.backend.dto.risk.ClassRiskOverviewDto;
import com.schoolmanagement.backend.dto.risk.RiskAssessmentDto;
import com.schoolmanagement.backend.dto.risk.TeacherFeedbackRequest;
import com.schoolmanagement.backend.exception.ApiException;
import com.schoolmanagement.backend.repo.classes.ClassEnrollmentRepository;
import com.schoolmanagement.backend.repo.classes.ClassRoomRepository;
import com.schoolmanagement.backend.repo.risk.RiskAssessmentHistoryRepository;
import com.schoolmanagement.backend.repo.risk.RiskMetricsSnapshotRepository;
import com.schoolmanagement.backend.repo.student.StudentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.*;

/**
 * Service chính phục vụ API cho Frontend Risk Analytics.
 * - Dashboard Heatmap (ClassRiskOverview)
 * - Student Risk History (cho LineChart)
 * - Teacher Feedback (xác nhận / bác bỏ cảnh báo)
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RiskAnalyticsService {

    private final RiskAssessmentHistoryRepository historyRepository;
    private final RiskMetricsSnapshotRepository snapshotRepository;
    private final ClassRoomRepository classRoomRepository;
    private final ClassEnrollmentRepository enrollmentRepository;
    private final StudentRepository studentRepository;
    private final AIRiskAnalysisService aiRiskAnalysisService;
    private final NightlyDataAggregatorService aggregatorService;

    private static final int HIGH_RISK_THRESHOLD = 80;
    private static final int MEDIUM_RISK_THRESHOLD = 50;

    // ══════════════════════════════════════════════
    // Dashboard Heatmap
    // ══════════════════════════════════════════════

    /**
     * Lấy tổng quan rủi ro toàn trường (phân theo lớp).
     */
    @Transactional(readOnly = true)
    public List<ClassRiskOverviewDto> getSchoolRiskOverview(School school) {
        List<ClassRoom> classRooms = classRoomRepository.findAllBySchoolOrderByGradeAscNameAsc(school);
        LocalDate latestDate = findLatestAssessmentDate(school);
        if (latestDate == null) {
            // Chưa có dữ liệu đánh giá
            return classRooms.stream().map(c -> ClassRiskOverviewDto.builder()
                    .classId(c.getId())
                    .className(c.getName())
                    .grade(c.getGrade())
                    .totalStudents((int) enrollmentRepository.countByClassRoom(c))
                    .highRiskCount(0).mediumRiskCount(0).lowRiskCount(0)
                    .riskLevel("SAFE")
                    .build()).toList();
        }

        return classRooms.stream().map(c -> buildClassOverview(c, latestDate)).toList();
    }

    private ClassRiskOverviewDto buildClassOverview(ClassRoom classRoom, LocalDate date) {
        List<RiskAssessmentHistory> assessments = historyRepository.findAllByClassAndDate(classRoom.getId(), date);
        int totalStudents = (int) enrollmentRepository.countByClassRoom(classRoom);

        int high = 0, medium = 0, low = 0;
        for (var a : assessments) {
            if (a.getRiskScore() >= HIGH_RISK_THRESHOLD)
                high++;
            else if (a.getRiskScore() >= MEDIUM_RISK_THRESHOLD)
                medium++;
            else
                low++;
        }

        String riskLevel = high > 0 ? "DANGER" : (medium > 0 ? "WATCH" : "SAFE");

        return ClassRiskOverviewDto.builder()
                .classId(classRoom.getId())
                .className(classRoom.getName())
                .grade(classRoom.getGrade())
                .totalStudents(totalStudents)
                .highRiskCount(high)
                .mediumRiskCount(medium)
                .lowRiskCount(low)
                .riskLevel(riskLevel)
                .build();
    }

    // ══════════════════════════════════════════════
    // Student Risk History (cho LineChart + Profile)
    // ══════════════════════════════════════════════

    /**
     * Lấy lịch sử phân tích rủi ro cho 1 học sinh (dùng cho LineChart).
     */
    @Transactional(readOnly = true)
    public List<RiskAssessmentDto> getStudentRiskHistory(School school, UUID studentId) {
        Student student = studentRepository.findByIdAndSchool(studentId, school)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy học sinh."));
        List<RiskAssessmentHistory> history = historyRepository.findAllByStudentOrderByAssessmentDateDesc(student);
        return history.stream().map(this::toDto).toList();
    }

    /**
     * Lấy đánh giá mới nhất của 1 học sinh.
     */
    @Transactional(readOnly = true)
    public RiskAssessmentDto getLatestRiskAssessment(School school, UUID studentId) {
        Student student = studentRepository.findByIdAndSchool(studentId, school)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy học sinh."));
        RiskAssessmentHistory latest = historyRepository.findLatestByStudent(student);
        return latest != null ? toDto(latest) : null;
    }

    /**
     * Lấy danh sách cảnh báo rủi ro cao PENDING chưa được giáo viên xử lý.
     */
    @Transactional(readOnly = true)
    public List<RiskAssessmentDto> getPendingAlerts(School school) {
        return historyRepository.findAllBySchoolAndFeedbackStatus(school, TeacherFeedbackStatus.PENDING)
                .stream()
                .filter(h -> h.getRiskScore() >= MEDIUM_RISK_THRESHOLD)
                .map(this::toDto)
                .toList();
    }

    // ══════════════════════════════════════════════
    // Teacher Feedback
    // ══════════════════════════════════════════════

    @Transactional
    public RiskAssessmentDto submitTeacherFeedback(TeacherFeedbackRequest request) {
        RiskAssessmentHistory history = historyRepository.findById(request.getAssessmentId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy đánh giá rủi ro."));
        history.setTeacherFeedback(request.getFeedback());
        history.setTeacherNote(request.getNote());
        historyRepository.save(history);
        return toDto(history);
    }

    // ══════════════════════════════════════════════
    // Trigger Manual Analysis
    // ══════════════════════════════════════════════

    /**
     * Trigger phân tích rủi ro thủ công (dùng cho Admin / API test).
     * 1. Chạy aggregation nếu chưa có snapshot hôm nay
     * 2. Gửi snapshots lên AI
     */
    @Transactional
    public List<RiskAssessmentDto> triggerAnalysis(School school) {
        log.info("[RiskAnalytics] Manual trigger cho trường: {}", school.getId());

        // Step 1: Ensure snapshots exist for today
        aggregatorService.aggregateForSchool(school);

        // Step 2: Lấy snapshots hôm nay
        LocalDate today = LocalDate.now();
        List<RiskMetricsSnapshot> snapshots = snapshotRepository.findAllBySchoolAndSnapshotDate(school, today);

        if (snapshots.isEmpty()) {
            log.info("[RiskAnalytics] Không có snapshot nào cho hôm nay.");
            return List.of();
        }

        // Step 3: Gửi AI phân tích
        List<RiskAssessmentHistory> results = aiRiskAnalysisService.analyzeSnapshots(snapshots, school);

        log.info("[RiskAnalytics] Phân tích hoàn tất: {} kết quả.", results.size());
        return results.stream().map(this::toDto).toList();
    }

    // ══════════════════════════════════════════════
    // Helpers
    // ══════════════════════════════════════════════

    private RiskAssessmentDto toDto(RiskAssessmentHistory h) {
        return RiskAssessmentDto.builder()
                .id(h.getId())
                .studentId(h.getStudent().getId())
                .studentName(h.getStudent().getFullName())
                .studentCode(h.getStudent().getStudentCode())
                .classId(h.getClassRoom() != null ? h.getClassRoom().getId() : null)
                .className(h.getClassRoom() != null ? h.getClassRoom().getName() : null)
                .assessmentDate(h.getAssessmentDate())
                .riskScore(h.getRiskScore())
                .riskCategory(h.getRiskCategory())
                .riskTrend(h.getRiskTrend())
                .aiReason(h.getAiReason())
                .aiAdvice(h.getAiAdvice())
                .teacherFeedback(h.getTeacherFeedback())
                .teacherNote(h.getTeacherNote())
                .notificationSent(h.isNotificationSent())
                .build();
    }

    private LocalDate findLatestAssessmentDate(School school) {
        // Lấy ngày assessment gần nhất của các bản ghi đang chờ xử lý
        return historyRepository.findLatestDateBySchoolAndStatus(school, TeacherFeedbackStatus.PENDING);
    }
}
