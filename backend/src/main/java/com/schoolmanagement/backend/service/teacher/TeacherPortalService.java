package com.schoolmanagement.backend.service.teacher;

import com.schoolmanagement.backend.dto.timetable.TimetableScheduleSummaryDto.SlotTimeDto;

import com.schoolmanagement.backend.dto.exam.ExamScheduleDto;

import com.schoolmanagement.backend.domain.exam.ExamStatus;
import java.util.Optional;
import com.schoolmanagement.backend.domain.timetable.TimetableStatus;
import java.util.Comparator;
import java.util.Map;
import java.util.ArrayList;
import java.util.Random;
import java.util.Locale;

import java.util.List;

import com.schoolmanagement.backend.dto.common.TodayScheduleItemDto;
import com.schoolmanagement.backend.dto.student.HomeroomStudentDto;
import com.schoolmanagement.backend.dto.student.StudentRiskAnalysisDto;
import com.schoolmanagement.backend.dto.common.AIRecommendationDto;

import com.schoolmanagement.backend.service.timetable.SchoolTimetableSettingsService;
import com.schoolmanagement.backend.dto.teacher.TeacherProfileDto;
import com.schoolmanagement.backend.dto.teacher.TeacherDashboardStatsDto;

import com.schoolmanagement.backend.domain.entity.classes.ClassRoom;
import com.schoolmanagement.backend.domain.entity.auth.User;

// import com.schoolmanagement.backend.dto.TimetableScheduleSummaryDto.SlotTimeDto;
import com.schoolmanagement.backend.domain.entity.classes.ClassEnrollment;
import com.schoolmanagement.backend.domain.entity.student.Student;
import com.schoolmanagement.backend.domain.entity.student.Guardian;
import com.schoolmanagement.backend.repo.classes.ClassEnrollmentRepository;
import com.schoolmanagement.backend.repo.classes.ClassRoomRepository;
import com.schoolmanagement.backend.repo.teacher.TeacherAssignmentRepository;
import com.schoolmanagement.backend.repo.teacher.TeacherRepository;
import com.schoolmanagement.backend.repo.timetable.TimetableDetailRepository;
import com.schoolmanagement.backend.repo.timetable.TimetableRepository;
import com.schoolmanagement.backend.repo.auth.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import com.schoolmanagement.backend.service.admin.SemesterService;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.TextStyle;
// // import java.util.*;
import java.util.stream.Collectors;
import java.util.LinkedHashMap;

/**
 * Service for Teacher Portal operations.
 * Determines teacher type (Subject vs Homeroom) and provides appropriate data.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class TeacherPortalService {

        private final UserRepository userRepository;
        private final ClassRoomRepository classRoomRepository;
        private final ClassEnrollmentRepository classEnrollmentRepository;
        private final TeacherAssignmentRepository teacherAssignmentRepository;
        private final TeacherRepository teacherRepository;
        private final TimetableDetailRepository timetableDetailRepository;
        private final TimetableRepository timetableRepository;
        private final SchoolTimetableSettingsService settingsService;
        private final com.schoolmanagement.backend.repo.teacher.ExamInvigilatorRepository examInvigilatorRepository;
        private final SemesterService semesterService;
        private final com.schoolmanagement.backend.repo.risk.RiskAssessmentHistoryRepository riskAssessmentHistoryRepository;

        private static final String[] CONDUCT_GRADES = { "Xuất sắc", "Tốt", "Khá", "Trung bình", "Yếu" };

        public List<ExamScheduleDto> getExamSchedule(String email, String semesterId) {
                User user = findTeacherByEmail(email);
                com.schoolmanagement.backend.domain.entity.teacher.Teacher teacher = teacherRepository.findByUser(user)
                                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                                                "Teacher not found"));
                
                com.schoolmanagement.backend.domain.entity.admin.Semester targetSemester = semesterId != null 
                        ? semesterService.getSemester(java.util.UUID.fromString(semesterId))
                        : semesterService.getActiveSemesterEntity(user.getSchool());

                List<com.schoolmanagement.backend.domain.entity.teacher.ExamInvigilator> invigilations;
                invigilations = examInvigilatorRepository.findByTeacherAndSemesterOrderByExamDate(teacher.getId(), targetSemester);

                LocalDate today = LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"));

                return invigilations.stream()
                                .map(invigilation -> {
                                        com.schoolmanagement.backend.domain.entity.exam.ExamSchedule exam = invigilation
                                                        .getExamRoom().getExamSchedule();
                                        com.schoolmanagement.backend.domain.entity.classes.ExamRoom room = invigilation
                                                        .getExamRoom();

                                        String status;
                                        if (exam.getStatus() == ExamStatus.COMPLETED
                                                        || exam.getStatus() == ExamStatus.CANCELLED) {
                                                status = exam.getStatus().name();
                                        } else if (exam.getExamDate().isBefore(today)) {
                                                status = "COMPLETED";
                                        } else {
                                                status = "UPCOMING";
                                        }

                                        ExamScheduleDto dto = ExamScheduleDto
                                                        .builder()
                                                        .id(exam.getId().toString())
                                                        .subjectName(exam.getSubject().getName())
                                                        .examDate(exam.getExamDate().toString())
                                                        .startTime(exam.getStartTime().toString())
                                                        .duration(exam.getDuration())
                                                        .examType(exam.getExamType().name())
                                                        .room(room.getRoom().getName())
                                                        .status(status)
                                                        .note(exam.getNote())
                                                        .build();
                                        return dto;
                                })
                                .collect(Collectors.toList());
        }

        /**
         * Get teacher profile with isHomeroomTeacher flag
         */
        public TeacherProfileDto getTeacherProfile(String email) {
                User teacher = findTeacherByEmail(email);
                com.schoolmanagement.backend.domain.entity.admin.AcademicYear currentAcademicYear = semesterService.getActiveAcademicYear(teacher.getSchool());

                log.info("=== Teacher Profile Debug ===");
                log.info("Teacher email: {}, User ID: {}", email, teacher.getId());
                log.info("Current academic year: {}", currentAcademicYear != null ? currentAcademicYear.getName() : "null");

                // First try with current academic year
                Optional<ClassRoom> homeroomClass = classRoomRepository
                                .findByHomeroomTeacher_IdAndAcademicYear(teacher.getId(), currentAcademicYear);
                log.info("Homeroom class found for year {}: {}", currentAcademicYear, homeroomClass.isPresent());

                // Fallback: try without year filter (safely find LATEST assignment)
                if (homeroomClass.isEmpty()) {
                        homeroomClass = classRoomRepository
                                        .findTopByHomeroomTeacher_IdOrderByAcademicYearDesc(teacher.getId());
                        log.info("Homeroom class found (any year fallback): {}", homeroomClass.isPresent());
                        if (homeroomClass.isPresent()) {
                                log.info("Found class: {} in year: {}",
                                                homeroomClass.get().getName(),
                                                homeroomClass.get().getAcademicYear());
                        }
                }

                if (homeroomClass.isPresent()) {
                        log.info("SUCCESS - Homeroom class: {} | ID: {} | Year: {}",
                                        homeroomClass.get().getName(),
                                        homeroomClass.get().getId(),
                                        homeroomClass.get().getAcademicYear());
                } else {
                        log.warn("!!! NO HOMEROOM CLASS FOUND for teacher: {} (User ID: {})", email, teacher.getId());
                        log.warn("!!! Please verify homeroom_teacher_id in classrooms table matches User.id: {}",
                                        teacher.getId());
                }

                boolean isHomeroom = homeroomClass.isPresent();

                // Get assigned classes (from teacher assignments)
                List<TeacherProfileDto.AssignedClassDto> assignedClasses = getAssignedClasses(teacher);

                return TeacherProfileDto.builder()
                                .isHomeroomTeacher(isHomeroom)
                                .homeroomClassId(isHomeroom ? homeroomClass.get().getId().toString() : null)
                                .homeroomClassName(isHomeroom ? homeroomClass.get().getName() : null)
                                .assignedClasses(assignedClasses)
                                .build();
        }

        /**
         * Get dashboard statistics based on teacher type
         */
        public TeacherDashboardStatsDto getDashboardStats(String email) {
                User teacher = findTeacherByEmail(email);
                Optional<ClassRoom> homeroomClass = classRoomRepository.findByHomeroomTeacher(teacher);
                boolean isHomeroom = homeroomClass.isPresent();

                // Count assigned classes from assignments
                int assignedClassCount = getAssignedClassCount(teacher);
                int todayPeriods = getTodayPeriodCount(teacher);

                TeacherDashboardStatsDto.TeacherDashboardStatsDtoBuilder builder = TeacherDashboardStatsDto.builder()
                                .totalAssignedClasses(assignedClassCount)
                                .todayPeriods(todayPeriods);

                // Add homeroom-specific stats if applicable
                if (isHomeroom) {
                        ClassRoom homeroom = homeroomClass.get();
                        int studentCount = getStudentCount(homeroom);

                        builder.totalStudents(studentCount)
                                        .homeroomClassName(homeroom.getName())
                                        .todayAttendance(TeacherDashboardStatsDto.AttendanceDto.builder()
                                                        .present(0) // Default to 0 until real-time aggregation is implemented
                                                        .total(studentCount)
                                                        .build())
                                        .studentsNeedingAttention(0)
                                        .averageGpa(0.0)
                                        .attendanceRate(0.0)
                                        .excellentStudents(0)
                                        .pendingAssignments(0);
                }

                return builder.build();
        }

        /**
         * Get today's schedule
         */
        public List<TodayScheduleItemDto> getTodaySchedule(String email) {
                User user = findTeacherByEmail(email);
                com.schoolmanagement.backend.domain.entity.teacher.Teacher teacher = teacherRepository.findByUser(user)
                                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                                                "Teacher profile not found"));

                // Get today's day of week - use Vietnam timezone to avoid UTC mismatch on server
                LocalDate today = LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"));
                DayOfWeek dayOfWeek = today.getDayOfWeek();
                log.info("getTodaySchedule: today={} dayOfWeek={} (zone=Asia/Ho_Chi_Minh)", today, dayOfWeek);

                com.schoolmanagement.backend.domain.entity.admin.Semester activeSemester = semesterService.getActiveSemesterEntity(user.getSchool());
                Optional<com.schoolmanagement.backend.domain.entity.timetable.Timetable> timetableOpt = timetableRepository
                                .findFirstBySchoolAndSemesterAndStatusOrderByCreatedAtDesc(user.getSchool(), activeSemester,
                                                TimetableStatus.OFFICIAL);

                if (timetableOpt.isEmpty()) {
                        return List.of();
                }

                // Get details for teacher
                List<com.schoolmanagement.backend.domain.entity.timetable.TimetableDetail> details = timetableDetailRepository
                                .findAllByTimetableAndTeacher(timetableOpt.get(), teacher);

                return details.stream()
                                .filter(d -> d.getDayOfWeek() == dayOfWeek)
                                // Deduplicate: keep only one entry per slotIndex (prevent duplicate periods)
                                .collect(Collectors.toMap(
                                        com.schoolmanagement.backend.domain.entity.timetable.TimetableDetail::getSlotIndex,
                                        d -> d,
                                        (existing, duplicate) -> existing,
                                        LinkedHashMap::new))
                                .values().stream()
                                .sorted(Comparator.comparingInt(
                                                com.schoolmanagement.backend.domain.entity.timetable.TimetableDetail::getSlotIndex))
                                .map(d -> mapToTodayScheduleItemDto(d, user.getSchool()))
                                .toList();
        }

        /**
         * Get weekly schedule
         */
        public List<com.schoolmanagement.backend.dto.timetable.TimetableDetailDto> getWeeklySchedule(String email, String semesterId) {
                User user = findTeacherByEmail(email);
                com.schoolmanagement.backend.domain.entity.teacher.Teacher teacher = teacherRepository.findByUser(user)
                                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                                                "Teacher profile not found"));

                // Get official timetable
                com.schoolmanagement.backend.domain.entity.admin.Semester targetSemester = semesterId != null 
                        ? semesterService.getSemester(java.util.UUID.fromString(semesterId))
                        : semesterService.getActiveSemesterEntity(user.getSchool());
                        
                Optional<com.schoolmanagement.backend.domain.entity.timetable.Timetable> timetableOpt = timetableRepository
                                .findFirstBySchoolAndSemesterAndStatusOrderByCreatedAtDesc(user.getSchool(), targetSemester,
                                                TimetableStatus.OFFICIAL);

                if (timetableOpt.isEmpty()) {
                        return List.of();
                }

                // Get slot times for this school
                List<SlotTimeDto> slotTimes = settingsService.getAllSlotTimes(user.getSchool());
                Map<Integer, SlotTimeDto> slotTimeMap = slotTimes.stream()
                                .collect(Collectors.toMap(SlotTimeDto::getSlotIndex, s -> s));

                // Get details for teacher
                List<com.schoolmanagement.backend.domain.entity.timetable.TimetableDetail> details = timetableDetailRepository
                                .findAllByTimetableAndTeacher(timetableOpt.get(), teacher);

                // Deduplicate: keep only one entry per (dayOfWeek, slotIndex) combination
                // This prevents showing duplicate periods (e.g., two "period 3" on the same day)
                return details.stream()
                                .collect(Collectors.toMap(
                                        d -> d.getDayOfWeek().name() + "-" + d.getSlotIndex(),
                                        d -> d,
                                        (existing, duplicate) -> existing,
                                        LinkedHashMap::new))
                                .values().stream()
                                .map(d -> {
                                        SlotTimeDto slotTime = slotTimeMap.get(d.getSlotIndex());
                                        return new com.schoolmanagement.backend.dto.timetable.TimetableDetailDto(
                                                        d.getId(),
                                                        d.getClassRoom().getId(),
                                                        d.getClassRoom().getName(),
                                                        d.getSubject().getId(),
                                                        d.getSubject().getName(),
                                                        d.getSubject().getCode(),
                                                        d.getTeacher().getId(),
                                                        d.getTeacher().getFullName(),
                                                        d.getDayOfWeek().name(),
                                                        d.getSlotIndex(),
                                                        d.isFixed());
                                })
                                .toList();
        }

        /**
         * Get homeroom students (403 for subject-only teachers)
         */
        public List<HomeroomStudentDto> getHomeroomStudents(String email) {
                User teacher = findTeacherByEmail(email);
                Optional<ClassRoom> homeroomClass = classRoomRepository.findByHomeroomTeacher(teacher);

                if (homeroomClass.isEmpty()) {
                        throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                                        "Only homeroom teachers can access student list");
                }

                ClassRoom homeroom = homeroomClass.get();
                com.schoolmanagement.backend.domain.entity.admin.AcademicYear currentAcademicYear = homeroom.getAcademicYear();

                // Fetch enrollments for this classroom in current academic year
                List<ClassEnrollment> enrollments = classEnrollmentRepository
                                .findAllByClassRoomAndAcademicYear(homeroom, currentAcademicYear);

                return enrollments.stream()
                                .map(enrollment -> mapToHomeroomStudentDto(enrollment.getStudent()))
                                .toList();
        }

        /**
         * Get AI risk analysis (homeroom only, real data from risk service)
         */
        public List<StudentRiskAnalysisDto> getRiskAnalysis(String email) {
                User teacher = findTeacherByEmail(email);
                Optional<ClassRoom> homeroomClass = classRoomRepository.findByHomeroomTeacher(teacher);

                if (homeroomClass.isEmpty()) {
                        throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                                        "Only homeroom teachers can access risk analysis");
                }

                ClassRoom homeroom = homeroomClass.get();
                com.schoolmanagement.backend.domain.entity.admin.AcademicYear currentAcademicYear = homeroom.getAcademicYear();
                List<ClassEnrollment> enrollments = classEnrollmentRepository.findAllByClassRoomAndAcademicYear(homeroom, currentAcademicYear);

                List<StudentRiskAnalysisDto> result = new java.util.ArrayList<>();
                for (ClassEnrollment enrollment : enrollments) {
                    com.schoolmanagement.backend.domain.entity.student.Student student = enrollment.getStudent();
                    com.schoolmanagement.backend.domain.entity.risk.RiskAssessmentHistory latest = riskAssessmentHistoryRepository.findLatestByStudent(student);
                    
                    if (latest != null && latest.getRiskScore() >= 50) { // Only show students with notable risk
                        StudentRiskAnalysisDto.RiskLevel level;
                        if (latest.getRiskScore() >= 80) level = StudentRiskAnalysisDto.RiskLevel.HIGH;
                        else if (latest.getRiskScore() >= 60) level = StudentRiskAnalysisDto.RiskLevel.MEDIUM;
                        else level = StudentRiskAnalysisDto.RiskLevel.LOW;

                        result.add(StudentRiskAnalysisDto.builder()
                            .studentId(student.getId().toString())
                            .studentName(student.getFullName())
                            .riskLevel(level)
                            .riskType(latest.getRiskCategory() != null ? latest.getRiskCategory().name() : "MIXED")
                            .metrics(List.of(
                                new StudentRiskAnalysisDto.MetricDto("Risk Score", latest.getRiskScore(), 100)
                            ))
                            .issues(latest.getAiReason() != null && !latest.getAiReason().isBlank() ? List.of(latest.getAiReason()) : List.of())
                            .suggestions(latest.getAiAdvice() != null && !latest.getAiAdvice().isBlank() ? List.of(latest.getAiAdvice()) : List.of())
                            .build());
                    }
                }
                
                // Sort by risk score descending
                return result.stream()
                        .sorted(java.util.Comparator.comparingInt((StudentRiskAnalysisDto dto) -> dto.getMetrics().get(0).getValue()).reversed())
                        .toList();
        }

        /**
         * Get AI recommendations (homeroom only, real data from risk service)
         */
        public List<AIRecommendationDto> getRecommendations(String email) {
                User teacher = findTeacherByEmail(email);
                Optional<ClassRoom> homeroomClass = classRoomRepository.findByHomeroomTeacher(teacher);

                if (homeroomClass.isEmpty()) {
                        throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                                        "Only homeroom teachers can access AI recommendations");
                }

                ClassRoom homeroom = homeroomClass.get();
                com.schoolmanagement.backend.domain.entity.admin.AcademicYear currentAcademicYear = homeroom.getAcademicYear();
                List<ClassEnrollment> enrollments = classEnrollmentRepository.findAllByClassRoomAndAcademicYear(homeroom, currentAcademicYear);

                List<AIRecommendationDto> result = new java.util.ArrayList<>();
                for (ClassEnrollment enrollment : enrollments) {
                    com.schoolmanagement.backend.domain.entity.student.Student student = enrollment.getStudent();
                    com.schoolmanagement.backend.domain.entity.risk.RiskAssessmentHistory latest = riskAssessmentHistoryRepository.findLatestByStudent(student);
                    
                    if (latest != null && latest.getRiskScore() >= 60) {
                        AIRecommendationDto.RecommendationType type;
                        try {
                            type = AIRecommendationDto.RecommendationType.valueOf(latest.getRiskCategory().name());
                        } catch (Exception e) {
                            type = AIRecommendationDto.RecommendationType.ACADEMIC;
                        }
                        
                        AIRecommendationDto.Priority priority = latest.getRiskScore() >= 80 ? AIRecommendationDto.Priority.HIGH : AIRecommendationDto.Priority.MEDIUM;
                        
                        result.add(AIRecommendationDto.builder()
                            .id(latest.getId().toString())
                            .type(type)
                            .priority(priority)
                            .title("Cần hỗ trợ học sinh: " + student.getFullName())
                            .description(latest.getAiReason() != null ? latest.getAiReason() : "Học sinh có dấu hiệu rủi ro mức độ " + priority.name())
                            .actions(latest.getAiAdvice() != null && !latest.getAiAdvice().isBlank() ? List.of(latest.getAiAdvice()) : List.of("Tổ chức buổi gặp mặt phụ huynh"))
                            .build());
                    }
                }
                
                // Sort by priority (HIGH first)
                return result.stream()
                        .sorted((a, b) -> a.getPriority().compareTo(b.getPriority()))
                        .toList();
        }

        // ==================== HELPER METHODS ====================

        private User findTeacherByEmail(String email) {
                return userRepository.findByEmailIgnoreCase(email)
                                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                                                "Teacher not found: " + email));
        }

        private List<TeacherProfileDto.AssignedClassDto> getAssignedClasses(User user) {
                com.schoolmanagement.backend.domain.entity.teacher.Teacher teacher = teacherRepository.findByUser(user)
                                .orElse(null);
                if (teacher == null)
                        return new ArrayList<>();

                List<com.schoolmanagement.backend.domain.entity.teacher.TeacherAssignment> assignments = teacherAssignmentRepository
                                .findAllByTeacher(teacher);

                return assignments.stream()
                                .map(a -> TeacherProfileDto.AssignedClassDto.builder()
                                                .classId(a.getClassRoom().getId().toString())
                                                .className(a.getClassRoom().getName())
                                                .subjectId(a.getSubject().getId().toString())
                                                .subjectName(a.getSubject().getName())
                                                .build())
                                .toList();
        }

        private int getAssignedClassCount(User teacher) {
                com.schoolmanagement.backend.domain.entity.teacher.Teacher teacherObj = teacherRepository.findByUser(teacher)
                                .orElse(null);
                if (teacherObj == null) return 0;
                return teacherAssignmentRepository.findAllByTeacher(teacherObj).size();
        }

        private int getTodayPeriodCount(User teacher) {
                return getTodaySchedule(teacher.getEmail()).size();
        }

        private int getStudentCount(ClassRoom classRoom) {
                com.schoolmanagement.backend.domain.entity.admin.AcademicYear currentAcademicYear = classRoom.getAcademicYear();
                List<ClassEnrollment> enrollments = classEnrollmentRepository
                                .findAllByClassRoomAndAcademicYear(classRoom, currentAcademicYear);
                return enrollments.size();
        }

        // getCurrentAcademicYear() removed — now using semesterService.getActiveAcademicYearName()

        private HomeroomStudentDto mapToHomeroomStudentDto(Student student) {
                Guardian guardian = student.getGuardian();
                return HomeroomStudentDto.builder()
                                .id(student.getId().toString())
                                .studentCode(student.getStudentCode())
                                .fullName(student.getFullName())
                                .gender(student.getGender() != null ? student.getGender().name() : null)
                                .email(student.getEmail())
                                .phone(student.getPhone())
                                .avatarUrl(student.getAvatarUrl())
                                .status(student.getStatus().name())
                                .attendanceRate(0.0) // Set to 0 until real-time aggregation is implemented
                                .averageGpa(0.0)     // Set to 0 until real-time aggregation is implemented
                                .conductGrade("Chưa xếp loại")
                                .parentPhone(guardian != null ? guardian.getPhone() : null)
                                .parentEmail(guardian != null ? guardian.getEmail() : null)
                                .build();
        }

        private String getDayName(DayOfWeek day) {
                Map<DayOfWeek, String> dayNames = Map.of(
                                DayOfWeek.MONDAY, "Thứ hai",
                                DayOfWeek.TUESDAY, "Thứ ba",
                                DayOfWeek.WEDNESDAY, "Thứ tư",
                                DayOfWeek.THURSDAY, "Thứ năm",
                                DayOfWeek.FRIDAY, "Thứ sáu",
                                DayOfWeek.SATURDAY, "Thứ bảy",
                                DayOfWeek.SUNDAY, "Chủ nhật");
                return dayNames.getOrDefault(day, day.getDisplayName(TextStyle.FULL, Locale.forLanguageTag("vi")));
        }

        private TodayScheduleItemDto mapToTodayScheduleItemDto(
                        com.schoolmanagement.backend.domain.entity.timetable.TimetableDetail detail,
                        com.schoolmanagement.backend.domain.entity.admin.School school) {
                                
                String startTime = "00:00";
                String endTime = "00:00";
                
                try {
                    SlotTimeDto slotTime = settingsService.calculateSlotTime(school, detail.getSlotIndex());
                    startTime = slotTime.getStartTime();
                    endTime = slotTime.getEndTime();
                } catch (Exception e) {
                    log.warn("Could not calculate slot time for slot {}: {}", detail.getSlotIndex(), e.getMessage());
                }

                return TodayScheduleItemDto.builder()
                                .periodNumber(detail.getSlotIndex())
                                .subjectName(detail.getSubject().getName())
                                .className(detail.getClassRoom().getName())
                                .roomNumber(detail.getClassRoom().getRoom() != null
                                                ? detail.getClassRoom().getRoom().getName()
                                                : "Chưa gán")
                                .startTime(startTime)
                                .endTime(endTime)
                                .build();
        }

        // ==================== MOCK DATA METHODS ====================

        private List<StudentRiskAnalysisDto> getMockRiskAnalysis() {
                return List.of(
                                StudentRiskAnalysisDto.builder()
                                                .studentId("student-1")
                                                .studentName("Hoàng Văn Em")
                                                .riskLevel(StudentRiskAnalysisDto.RiskLevel.HIGH)
                                                .riskType("Đang giảm")
                                                .metrics(List.of(
                                                                StudentRiskAnalysisDto.MetricDto.builder()
                                                                                .label("Học tập")
                                                                                .value(30)
                                                                                .maxValue(100)
                                                                                .build(),
                                                                StudentRiskAnalysisDto.MetricDto.builder()
                                                                                .label("Chuyên cần")
                                                                                .value(25)
                                                                                .maxValue(100)
                                                                                .build()))
                                                .issues(List.of("Điểm số giảm liên tục 3 tháng gần đây"))
                                                .suggestions(List.of(
                                                                "Liên hệ phụ huynh để trao đổi",
                                                                "Theo dõi sát trong các tiết học"))
                                                .build(),
                                StudentRiskAnalysisDto.builder()
                                                .studentId("student-2")
                                                .studentName("Lê Văn Cường")
                                                .riskLevel(StudentRiskAnalysisDto.RiskLevel.MEDIUM)
                                                .riskType("Ổn định")
                                                .metrics(List.of(
                                                                StudentRiskAnalysisDto.MetricDto.builder()
                                                                                .label("Học tập")
                                                                                .value(45)
                                                                                .maxValue(100)
                                                                                .build()))
                                                .issues(List.of())
                                                .suggestions(List.of())
                                                .build());
        }

        private List<AIRecommendationDto> getMockRecommendations() {
                return List.of(
                                AIRecommendationDto.builder()
                                                .id("rec-1")
                                                .type(AIRecommendationDto.RecommendationType.ACADEMIC)
                                                .priority(AIRecommendationDto.Priority.HIGH)
                                                .title("Cải thiện kết quả môn Toán")
                                                .description("5 học sinh có điểm môn Toán dưới trung bình. Cần can thiệp sớm.")
                                                .actions(List.of(
                                                                "Tổ chức buổi học phụ đạo vào thứ 7",
                                                                "Giao bài tập thêm cho các em yếu"))
                                                .build(),
                                AIRecommendationDto.builder()
                                                .id("rec-2")
                                                .type(AIRecommendationDto.RecommendationType.ATTENDANCE)
                                                .priority(AIRecommendationDto.Priority.MEDIUM)
                                                .title("Tăng cường điểm danh")
                                                .description("Tỷ lệ vắng mặt tăng 15% so với tháng trước.")
                                                .actions(List.of("Liên hệ phụ huynh các em hay vắng"))
                                                .build(),
                                AIRecommendationDto.builder()
                                                .id("rec-3")
                                                .type(AIRecommendationDto.RecommendationType.DISCIPLINE)
                                                .priority(AIRecommendationDto.Priority.MEDIUM)
                                                .title("Cải thiện kỷ luật lớp học")
                                                .description("Có 3 học sinh vi phạm kỷ luật tuần này.")
                                                .actions(List.of("Nhắc nhở trong giờ sinh hoạt lớp"))
                                                .build());
        }
}
