package com.schoolmanagement.backend.service.learning;

import com.schoolmanagement.backend.domain.entity.admin.School;
import com.schoolmanagement.backend.domain.entity.admin.Semester;
import com.schoolmanagement.backend.domain.entity.classes.ClassRoom;
import com.schoolmanagement.backend.domain.entity.learning.LearningAnalysisReport;
import com.schoolmanagement.backend.domain.entity.student.Student;
import com.schoolmanagement.backend.dto.learning.ClassLearningOverviewDto;
import com.schoolmanagement.backend.dto.learning.LearningAnalysisDto;
import com.schoolmanagement.backend.exception.ApiException;
import com.schoolmanagement.backend.repo.classes.ClassEnrollmentRepository;
import com.schoolmanagement.backend.repo.classes.ClassRoomRepository;
import com.schoolmanagement.backend.repo.learning.LearningAnalysisReportRepository;
import com.schoolmanagement.backend.repo.student.StudentRepository;
import com.schoolmanagement.backend.service.admin.SemesterService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Service chính phục vụ API cho Frontend Learning Analytics.
 * - Student Portal: xem báo cáo cá nhân
 * - Teacher Profile Tab: xem báo cáo theo học sinh, trigger phân tích
 * - Admin Dashboard: tổng quan toàn trường, trigger phân tích batch
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class LearningAnalyticsService {

    private final LearningAnalysisReportRepository reportRepository;
    private final AILearningAnalyticsService aiService;
    private final StudentRepository studentRepository;
    private final ClassRoomRepository classRoomRepository;
    private final ClassEnrollmentRepository enrollmentRepository;
    private final SemesterService semesterService;

    // ══════════════════════════════════════════════
    // Student Portal: Xem báo cáo của chính mình
    // ══════════════════════════════════════════════

    /**
     * Học sinh xem báo cáo phân tích mới nhất (read-only, không trigger).
     */
    @Transactional(readOnly = true)
    public LearningAnalysisDto getMyReport(Student student) {
        return reportRepository.findLatestByStudent(student)
                .map(this::toDto)
                .orElse(null);
    }

    // ══════════════════════════════════════════════
    // Teacher/Admin: Xem báo cáo của 1 học sinh
    // ══════════════════════════════════════════════

    /**
     * Lấy báo cáo phân tích mới nhất của 1 học sinh.
     */
    @Transactional(readOnly = true)
    public LearningAnalysisDto getStudentReport(com.schoolmanagement.backend.domain.entity.auth.User user, UUID studentId) {
        School school = user.getSchool();
        Student student = studentRepository.findByIdAndSchool(studentId, school)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy học sinh."));
        verifyTeacherAccess(user, student);
        return reportRepository.findLatestByStudent(student)
                .map(this::toDto)
                .orElse(null);
    }

    /**
     * Lấy lịch sử tất cả báo cáo của 1 học sinh (cho biểu đồ xu hướng GPA).
     */
    @Transactional(readOnly = true)
    public List<LearningAnalysisDto> getStudentReportHistory(com.schoolmanagement.backend.domain.entity.auth.User user, UUID studentId) {
        School school = user.getSchool();
        Student student = studentRepository.findByIdAndSchool(studentId, school)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy học sinh."));
        verifyTeacherAccess(user, student);
        return reportRepository.findAllByStudentOrderByCreatedAtDesc(student)
                .stream().map(this::toDto).toList();
    }

    // ══════════════════════════════════════════════
    // Teacher: Trigger phân tích 1 học sinh
    // ══════════════════════════════════════════════

    /**
     * Giáo viên trigger phân tích học tập cho 1 học sinh cụ thể.
     */
    @Transactional
    public LearningAnalysisDto triggerStudentAnalysis(com.schoolmanagement.backend.domain.entity.auth.User user, UUID studentId) {
        School school = user.getSchool();
        Student student = studentRepository.findByIdAndSchool(studentId, school)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy học sinh."));
        verifyTeacherAccess(user, student);

        Semester semester = semesterService.getActiveSemesterEntity(school);
        if (semester == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Chưa có học kỳ nào đang hoạt động.");
        }

        log.info("[LearningAnalytics] Teacher trigger phân tích cho HS {} trong kỳ {}.",
                studentId, semester.getName());

        LearningAnalysisReport report = aiService.analyzeStudent(student, semester, school);
        return report != null ? toDto(report) : null;
    }

    // ══════════════════════════════════════════════
    // Teacher Dashboard: Homeroom Students
    // ══════════════════════════════════════════════

    /**
     * Lấy danh sách báo cáo học tập của tất cả học sinh trong lớp chủ nhiệm.
     */
    @Transactional(readOnly = true)
    public List<LearningAnalysisDto> getHomeroomStudentsReports(com.schoolmanagement.backend.domain.entity.auth.User user) {
        if (user.getRole() != com.schoolmanagement.backend.domain.auth.Role.TEACHER) {
            return List.of();
        }
        School school = user.getSchool();
        Semester semester = semesterService.getActiveSemesterEntity(school);
        if (semester == null) return List.of();
        
        ClassRoom homeroom = classRoomRepository.findByHomeroomTeacher(user).orElse(null);
        if (homeroom == null) return List.of();
        
        List<com.schoolmanagement.backend.domain.entity.classes.ClassEnrollment> enrollments = enrollmentRepository.findAllByClassRoomAndAcademicYear(homeroom, semester.getAcademicYear());
        
        List<LearningAnalysisReport> reports = reportRepository.findAllByClassAndSemester(homeroom.getId(), semester);
        Map<UUID, LearningAnalysisReport> reportMap = reports.stream()
            .collect(Collectors.toMap(r -> r.getStudent().getId(), r -> r, (r1, r2) -> r1)); // take first if duplicate
        
        return enrollments.stream().map(e -> {
            Student student = e.getStudent();
            LearningAnalysisReport r = reportMap.get(student.getId());
            if (r != null) {
                return toDto(r);
            } else {
                return LearningAnalysisDto.builder()
                        .id(null)
                        .studentId(student.getId())
                        .studentName(student.getFullName())
                        .studentCode(student.getStudentCode())
                        .classId(homeroom.getId())
                        .className(homeroom.getName())
                        .semesterName(semester.getName())
                        .build();
            }
        }).toList();
    }

    // ══════════════════════════════════════════════
    // Admin Dashboard: Tổng quan toàn trường
    // ══════════════════════════════════════════════

    /**
     * Lấy tổng quan chất lượng học tập toàn trường (phân theo lớp).
     */
    @Transactional(readOnly = true)
    public List<ClassLearningOverviewDto> getSchoolOverview(com.schoolmanagement.backend.domain.entity.auth.User user) {
        School school = user.getSchool();
        Semester semester = semesterService.getActiveSemesterEntity(school);
        if (semester == null) return List.of();

        List<ClassRoom> classRooms = classRoomRepository.findAllBySchoolOrderByGradeAscNameAsc(school);
        
        if (user.getRole() == com.schoolmanagement.backend.domain.auth.Role.TEACHER) {
            classRooms = classRooms.stream()
                .filter(c -> c.getHomeroomTeacher() != null && c.getHomeroomTeacher().getId().equals(user.getId()))
                .collect(Collectors.toList());
        }

        List<LearningAnalysisReport> allReports = reportRepository.findAllBySchoolAndSemester(school, semester);

        // Group reports by classRoom
        Map<UUID, List<LearningAnalysisReport>> reportsByClass = allReports.stream()
                .filter(r -> r.getClassRoom() != null)
                .collect(Collectors.groupingBy(r -> r.getClassRoom().getId()));

        return classRooms.stream().map(c -> {
            long totalStudents = enrollmentRepository.countByClassRoom(c);
            List<LearningAnalysisReport> classReports = reportsByClass.getOrDefault(c.getId(), List.of());

            long excellent = 0, good = 0, average = 0, weak = 0;
            double sumPredicted = 0, sumCurrent = 0;
            int countPredicted = 0, countCurrent = 0;

            for (LearningAnalysisReport r : classReports) {
                if (r.getPredictedGpa() != null) {
                    sumPredicted += r.getPredictedGpa();
                    countPredicted++;
                    if (r.getPredictedGpa() >= 8.0) excellent++;
                    else if (r.getPredictedGpa() >= 6.5) good++;
                    else if (r.getPredictedGpa() >= 5.0) average++;
                    else weak++;
                }
                if (r.getCurrentGpa() != null) {
                    sumCurrent += r.getCurrentGpa();
                    countCurrent++;
                }
            }

            return ClassLearningOverviewDto.builder()
                    .classId(c.getId())
                    .className(c.getName())
                    .gradeLevel(c.getGrade())
                    .totalStudents(totalStudents)
                    .analyzedCount(classReports.size())
                    .avgPredictedGpa(countPredicted > 0 ? Math.round(sumPredicted / countPredicted * 100.0) / 100.0 : null)
                    .avgCurrentGpa(countCurrent > 0 ? Math.round(sumCurrent / countCurrent * 100.0) / 100.0 : null)
                    .excellentCount(excellent)
                    .goodCount(good)
                    .averageCount(average)
                    .weakCount(weak)
                    .build();
        }).toList();
    }

    // ══════════════════════════════════════════════
    // Admin: Trigger phân tích toàn trường
    // ══════════════════════════════════════════════

    /**
     * Admin trigger phân tích học tập cho toàn trường.
     */
    @Transactional
    public List<LearningAnalysisDto> triggerSchoolAnalysis(School school) {
        Semester semester = semesterService.getActiveSemesterEntity(school);
        if (semester == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Chưa có học kỳ nào đang hoạt động.");
        }

        log.info("[LearningAnalytics] Admin trigger phân tích toàn trường cho kỳ {}.", semester.getName());

        List<LearningAnalysisReport> results = aiService.analyzeSchool(school, semester);
        log.info("[LearningAnalytics] Phân tích hoàn tất: {} báo cáo.", results.size());

        return results.stream().map(this::toDto).toList();
    }

    // ══════════════════════════════════════════════
    // Mapper
    // ══════════════════════════════════════════════

    private LearningAnalysisDto toDto(LearningAnalysisReport r) {
        return LearningAnalysisDto.builder()
                .id(r.getId())
                .studentId(r.getStudent().getId())
                .studentName(r.getStudent().getFullName())
                .studentCode(r.getStudent().getStudentCode())
                .classId(r.getClassRoom() != null ? r.getClassRoom().getId() : null)
                .className(r.getClassRoom() != null ? r.getClassRoom().getName() : null)
                .semesterName(r.getSemester().getName())
                .strengths(r.getStrengths())
                .weaknesses(r.getWeaknesses())
                .detailedAnalysis(r.getDetailedAnalysis())
                .learningAdvice(r.getLearningAdvice())
                .predictedGpa(r.getPredictedGpa())
                .currentGpa(r.getCurrentGpa())
                .analyzedAt(r.getUpdatedAt() != null ? r.getUpdatedAt() : r.getCreatedAt())
                .build();
    }

    private void verifyTeacherAccess(com.schoolmanagement.backend.domain.entity.auth.User user, Student student) {
        if (user.getRole() == com.schoolmanagement.backend.domain.auth.Role.TEACHER) {
            Semester semester = semesterService.getActiveSemesterEntity(user.getSchool());
            if (semester == null) return;
            
            com.schoolmanagement.backend.domain.entity.classes.ClassEnrollment enrollment = enrollmentRepository.findTopByStudentAndAcademicYearOrderByEnrolledAtDesc(student, semester.getAcademicYear()).orElse(null);
            if (enrollment == null || enrollment.getClassRoom() == null || enrollment.getClassRoom().getHomeroomTeacher() == null || !enrollment.getClassRoom().getHomeroomTeacher().getId().equals(user.getId())) {
                throw new ApiException(HttpStatus.FORBIDDEN, "Giáo viên chỉ được phép xem/phân tích học sinh lớp mình chủ nhiệm.");
            }
        }
    }
}
