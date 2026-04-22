package com.schoolmanagement.backend.service.teacher;

import com.schoolmanagement.backend.dto.timetable.TimetableScheduleSummaryDto.SlotTimeDto;

import com.schoolmanagement.backend.dto.exam.ExamScheduleDto;

import com.schoolmanagement.backend.domain.exam.ExamStatus;
import java.util.Optional;
import com.schoolmanagement.backend.domain.timetable.TimetableStatus;
import java.util.Comparator;
import java.util.Map;
import java.util.ArrayList;

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
import com.schoolmanagement.backend.service.student.StudentManagementService;
import com.schoolmanagement.backend.service.student.StudentPortalService;
import com.schoolmanagement.backend.dto.student.StudentProfileDto;
import com.schoolmanagement.backend.dto.grade.ScoreDto;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.stream.Collectors;
import java.util.LinkedHashMap;
import com.schoolmanagement.backend.util.StudentSortUtils;
import org.springframework.transaction.annotation.Transactional;

/**
 * Service for Teacher Portal operations.
 * Determines teacher type (Subject vs Homeroom) and provides appropriate data.
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class TeacherPortalService {

        private static final ZoneId VIETNAM_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

        private final UserRepository userRepository;
        private final ClassRoomRepository classRoomRepository;
        private final ClassEnrollmentRepository classEnrollmentRepository;
        private final TeacherAssignmentRepository teacherAssignmentRepository;
        private final TeacherRepository teacherRepository;
        private final TimetableDetailRepository timetableDetailRepository;
        private final TimetableRepository timetableRepository;
        private final SchoolTimetableSettingsService settingsService;
        private final SemesterService semesterService;
        private final com.schoolmanagement.backend.repo.risk.RiskAssessmentHistoryRepository riskAssessmentHistoryRepository;
        private final StudentManagementService studentManagementService;
        private final StudentPortalService studentPortalService;

        public List<ExamScheduleDto> getExamSchedule(String email, String semesterId) {
                // Exam schedule relies on Subject now. Returning empty or TODO depending on
                // business logic for Teacher.
                return new ArrayList<>();
        }

        /**
         * Get teacher profile with isHomeroomTeacher flag
         */
        public TeacherProfileDto getTeacherProfile(String email) {
                User teacher = findTeacherByEmail(email);

                Optional<ClassRoom> homeroomClass = findHomeroomClass(teacher);
                boolean isHomeroom = homeroomClass.isPresent();

                log.debug("Teacher profile: email={}, isHomeroom={}, class={}",
                                email, isHomeroom, isHomeroom ? homeroomClass.get().getName() : "NONE");

                List<TeacherProfileDto.AssignedClassDto> assignedClasses = getAssignedClasses(teacher);

                return TeacherProfileDto.builder()
                                .isHomeroomTeacher(isHomeroom)
                                .homeroomClassId(isHomeroom ? homeroomClass.get().getId().toString() : null)
                                .homeroomClassName(isHomeroom ? homeroomClass.get().getName() : null)
                                .assignedClasses(assignedClasses)
                                .build();
        }

        /**
         * Get dashboard statistics based on teacher type.
         * Optimized: uses lightweight count queries instead of loading full entity
         * lists.
         */
        public TeacherDashboardStatsDto getDashboardStats(String email) {
                User teacher = findTeacherByEmail(email);
                Optional<ClassRoom> homeroomClass = findHomeroomClass(teacher);
                boolean isHomeroom = homeroomClass.isPresent();

                int assignedClassCount = getAssignedClassCount(teacher);

                // Inline today period count to avoid re-querying the full timetable
                int todayPeriods = 0;
                com.schoolmanagement.backend.domain.entity.teacher.Teacher teacherEntity = teacherRepository
                                .findByUser(teacher).orElse(null);

                if (teacherEntity != null) {
                        var activeSem = semesterService.getActiveSemesterEntity(teacher.getSchool());
                        var ttOpt = timetableRepository.findFirstBySchoolAndSemesterAndStatusOrderByCreatedAtDesc(
                                        teacher.getSchool(), activeSem, TimetableStatus.OFFICIAL);
                        if (ttOpt.isPresent()) {
                                DayOfWeek dow = LocalDate.now(VIETNAM_ZONE).getDayOfWeek();
                                todayPeriods = (int) timetableDetailRepository
                                                .findAllByTimetableAndTeacher(ttOpt.get(), teacherEntity)
                                                .stream()
                                                .filter(d -> d.getDayOfWeek() == dow)
                                                .map(d -> d.getSlotIndex())
                                                .distinct()
                                                .count();
                        }
                }

                TeacherDashboardStatsDto.TeacherDashboardStatsDtoBuilder builder = TeacherDashboardStatsDto.builder()
                                .totalAssignedClasses(assignedClassCount)
                                .todayPeriods(todayPeriods);

                if (isHomeroom) {
                        ClassRoom homeroom = homeroomClass.get();
                        int studentCount = getStudentCount(homeroom);

                        builder.totalStudents(studentCount)
                                        .homeroomClassName(homeroom.getName())
                                        .todayAttendance(TeacherDashboardStatsDto.AttendanceDto.builder()
                                                        .present(0)
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
                                .orElse(null);

                if (teacher == null) {
                        log.warn("Teacher profile missing for user: {}", email);
                        return new ArrayList<>();
                }

                // Get today's day of week - use Vietnam timezone to avoid UTC mismatch on
                // server
                LocalDate today = LocalDate.now(VIETNAM_ZONE);
                DayOfWeek dayOfWeek = today.getDayOfWeek();
                log.debug("getTodaySchedule: today={} dayOfWeek={}", today, dayOfWeek);

                com.schoolmanagement.backend.domain.entity.admin.Semester activeSemester = semesterService
                                .getActiveSemesterEntity(user.getSchool());
                Optional<com.schoolmanagement.backend.domain.entity.timetable.Timetable> timetableOpt = timetableRepository
                                .findFirstBySchoolAndSemesterAndStatusOrderByCreatedAtDesc(user.getSchool(),
                                                activeSemester,
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
        public List<com.schoolmanagement.backend.dto.timetable.TimetableDetailDto> getWeeklySchedule(String email,
                        String semesterId) {
                User user = findTeacherByEmail(email);
                com.schoolmanagement.backend.domain.entity.teacher.Teacher teacher = teacherRepository.findByUser(user)
                                .orElse(null);

                if (teacher == null) {
                        log.warn("Teacher profile missing for user: {}", email);
                        return new ArrayList<>();
                }

                // Get official timetable
                com.schoolmanagement.backend.domain.entity.admin.Semester targetSemester = semesterId != null
                                ? semesterService.getSemester(java.util.UUID.fromString(semesterId))
                                : semesterService.getActiveSemesterEntity(user.getSchool());

                Optional<com.schoolmanagement.backend.domain.entity.timetable.Timetable> timetableOpt = timetableRepository
                                .findFirstBySchoolAndSemesterAndStatusOrderByCreatedAtDesc(user.getSchool(),
                                                targetSemester,
                                                TimetableStatus.OFFICIAL);

                if (timetableOpt.isEmpty()) {
                        return List.of();
                }

                // Get slot times for this school (safe check for null school)
                List<SlotTimeDto> slotTimes = user.getSchool() != null
                                ? settingsService.getAllSlotTimes(user.getSchool())
                                : new ArrayList<>();

                Map<Integer, SlotTimeDto> slotTimeMap = slotTimes.stream()
                                .collect(Collectors.toMap(SlotTimeDto::getSlotIndex, s -> s, (s1, s2) -> s1));

                // Get details for teacher
                List<com.schoolmanagement.backend.domain.entity.timetable.TimetableDetail> details = timetableDetailRepository
                                .findAllByTimetableAndTeacher(timetableOpt.get(), teacher);

                // Deduplicate: keep only one entry per (dayOfWeek, slotIndex) combination
                return details.stream()
                                .collect(Collectors.toMap(
                                                d -> d.getDayOfWeek().name() + "-" + d.getSlotIndex(),
                                                d -> d,
                                                (existing, duplicate) -> existing,
                                                LinkedHashMap::new))
                                .values().stream()
                                .map(d -> {
                                        SlotTimeDto st = slotTimeMap.get(d.getSlotIndex());
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
                                                        d.isFixed(),
                                                        d.getClassRoom().getGrade(),
                                                        st != null ? st.getStartTime() : null,
                                                        st != null ? st.getEndTime() : null);
                                })
                                .toList();
        }

        /**
         * 
         * Get homeroom students (403 for subject-only teachers)
         */
        public List<HomeroomStudentDto> getHomeroomStudents(String email, java.util.UUID classId) {
                User teacher = findTeacherByEmail(email);
                ClassRoom homeroom;

                if (classId != null) {
                        homeroom = classRoomRepository.findWithTeacherById(classId)
                                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                                                        "Class not found"));
                        if (homeroom.getHomeroomTeacher() == null
                                        || !homeroom.getHomeroomTeacher().getId().equals(teacher.getId())) {
                                throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                                                "You are not the homeroom teacher of this class");
                        }
                } else {
                        homeroom = findHomeroomClass(teacher)
                                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN,
                                                        "Only homeroom teachers can access student list"));
                }

                log.info("Fetching students for homeroom class: {} (ID: {})", homeroom.getName(), homeroom.getId());

                // Fetch enrollments for this classroom with students and guardians fetched
                // eagerly
                List<ClassEnrollment> enrollments = classEnrollmentRepository
                                .findAllByClassRoomWithStudentAndGuardian(homeroom);
                log.info("Found {} enrollments for class {}", enrollments.size(), homeroom.getName());

                return enrollments.stream()
                                .map(enrollment -> mapToHomeroomStudentDto(enrollment.getStudent()))
                                .sorted((s1, s2) -> StudentSortUtils.vietnameseNameComparator()
                                                .compare(s1.getFullName(), s2.getFullName()))
                                .toList();
        }

        /**
         * Get AI risk analysis (homeroom only, real data from risk service)
         */
        public List<StudentRiskAnalysisDto> getRiskAnalysis(String email) {
                User teacher = findTeacherByEmail(email);
                Optional<ClassRoom> homeroomClass = findHomeroomClass(teacher);

                if (homeroomClass.isEmpty()) {
                        throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                                        "Only homeroom teachers can access risk analysis");
                }

                ClassRoom homeroom = homeroomClass.get();
                com.schoolmanagement.backend.domain.entity.admin.AcademicYear currentAcademicYear = homeroom
                                .getAcademicYear();
                List<ClassEnrollment> enrollments = classEnrollmentRepository
                                .findAllByClassRoomAndAcademicYear(homeroom, currentAcademicYear);

                List<StudentRiskAnalysisDto> result = new java.util.ArrayList<>();
                for (ClassEnrollment enrollment : enrollments) {
                        com.schoolmanagement.backend.domain.entity.student.Student student = enrollment.getStudent();
                        com.schoolmanagement.backend.domain.entity.risk.RiskAssessmentHistory latest = riskAssessmentHistoryRepository
                                        .findLatestByStudent(student);

                        if (latest != null && latest.getRiskScore() >= 50) { // Only show students with notable risk
                                StudentRiskAnalysisDto.RiskLevel level;
                                if (latest.getRiskScore() >= 80)
                                        level = StudentRiskAnalysisDto.RiskLevel.HIGH;
                                else if (latest.getRiskScore() >= 60)
                                        level = StudentRiskAnalysisDto.RiskLevel.MEDIUM;
                                else
                                        level = StudentRiskAnalysisDto.RiskLevel.LOW;

                                result.add(StudentRiskAnalysisDto.builder()
                                                .studentId(student.getId().toString())
                                                .studentName(student.getFullName())
                                                .riskLevel(level)
                                                .riskType(latest.getRiskCategory() != null
                                                                ? latest.getRiskCategory().name()
                                                                : "MIXED")
                                                .metrics(List.of(
                                                                new StudentRiskAnalysisDto.MetricDto("Risk Score",
                                                                                latest.getRiskScore(), 100)))
                                                .issues(latest.getAiReason() != null && !latest.getAiReason().isBlank()
                                                                ? List.of(latest.getAiReason())
                                                                : List.of())
                                                .suggestions(latest.getAiAdvice() != null
                                                                && !latest.getAiAdvice().isBlank()
                                                                                ? List.of(latest.getAiAdvice())
                                                                                : List.of())
                                                .build());
                        }
                }

                // Sort by risk score descending
                return result.stream()
                                .sorted(java.util.Comparator.comparingInt(
                                                (StudentRiskAnalysisDto dto) -> dto.getMetrics().get(0).getValue())
                                                .reversed())
                                .toList();
        }

        /**
         * Get AI recommendations (homeroom only, real data from risk service)
         */
        public List<AIRecommendationDto> getRecommendations(String email) {
                User teacher = findTeacherByEmail(email);
                Optional<ClassRoom> homeroomClass = findHomeroomClass(teacher);

                if (homeroomClass.isEmpty()) {
                        throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                                        "Only homeroom teachers can access AI recommendations");
                }

                ClassRoom homeroom = homeroomClass.get();
                com.schoolmanagement.backend.domain.entity.admin.AcademicYear currentAcademicYear = homeroom
                                .getAcademicYear();
                List<ClassEnrollment> enrollments = classEnrollmentRepository
                                .findAllByClassRoomAndAcademicYear(homeroom, currentAcademicYear);

                List<AIRecommendationDto> result = new java.util.ArrayList<>();
                for (ClassEnrollment enrollment : enrollments) {
                        com.schoolmanagement.backend.domain.entity.student.Student student = enrollment.getStudent();
                        com.schoolmanagement.backend.domain.entity.risk.RiskAssessmentHistory latest = riskAssessmentHistoryRepository
                                        .findLatestByStudent(student);

                        if (latest != null && latest.getRiskScore() >= 60) {
                                AIRecommendationDto.RecommendationType type;
                                try {
                                        type = AIRecommendationDto.RecommendationType
                                                        .valueOf(latest.getRiskCategory().name());
                                } catch (Exception e) {
                                        type = AIRecommendationDto.RecommendationType.ACADEMIC;
                                }

                                AIRecommendationDto.Priority priority = latest.getRiskScore() >= 80
                                                ? AIRecommendationDto.Priority.HIGH
                                                : AIRecommendationDto.Priority.MEDIUM;

                                result.add(AIRecommendationDto.builder()
                                                .id(latest.getId().toString())
                                                .type(type)
                                                .priority(priority)
                                                .title("Cần hỗ trợ học sinh: " + student.getFullName())
                                                .description(latest.getAiReason() != null ? latest.getAiReason()
                                                                : "Học sinh có dấu hiệu rủi ro mức độ "
                                                                                + priority.name())
                                                .actions(latest.getAiAdvice() != null && !latest.getAiAdvice().isBlank()
                                                                ? List.of(latest.getAiAdvice())
                                                                : List.of("Tổ chức buổi gặp mặt phụ huynh"))
                                                .build());
                        }
                }

                // Sort by priority (HIGH first)
                return result.stream()
                                .sorted((a, b) -> a.getPriority().compareTo(b.getPriority()))
                                .toList();
        }

        /**
         * Get student profile (homeroom only)
         */
        public StudentProfileDto getHomeroomStudentProfile(String email, java.util.UUID studentId) {
                User teacher = findTeacherByEmail(email);
                Optional<ClassRoom> homeroomClass = findHomeroomClass(teacher);
                if (homeroomClass.isEmpty()) {
                        throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                                        "Only homeroom teachers can access student profile");
                }

                // Verify student is in homeroom
                boolean isInHomeroom = classEnrollmentRepository
                                .findAllByClassRoomAndAcademicYear(homeroomClass.get(),
                                                homeroomClass.get().getAcademicYear())
                                .stream().anyMatch(ce -> ce.getStudent().getId().equals(studentId));

                if (!isInHomeroom) {
                        throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                                        "Student not in your homeroom class");
                }

                return studentManagementService.getStudentProfile(teacher.getSchool(), studentId);
        }

        /**
         * Get student scores (homeroom only)
         */
        public List<ScoreDto> getHomeroomStudentScores(String email, java.util.UUID studentId,
                        java.util.UUID semesterId) {
                User teacher = findTeacherByEmail(email);
                Optional<ClassRoom> homeroomClass = findHomeroomClass(teacher);
                if (homeroomClass.isEmpty()) {
                        throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                                        "Only homeroom teachers can access student scores");
                }

                // Verify student is in homeroom
                boolean isInHomeroom = classEnrollmentRepository
                                .findAllByClassRoomAndAcademicYear(homeroomClass.get(),
                                                homeroomClass.get().getAcademicYear())
                                .stream().anyMatch(ce -> ce.getStudent().getId().equals(studentId));

                if (!isInHomeroom) {
                        throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                                        "Student not in your homeroom class");
                }

                String semIdStr = semesterId != null ? semesterId.toString() : null;
                return studentPortalService.getScores(studentId, semIdStr);
        }

        // ==================== HELPER METHODS ====================

        private User findTeacherByEmail(String email) {
                return userRepository.findByEmailIgnoreCaseWithSchool(email)
                                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                                                "Teacher not found: " + email));
        }

        /**
         * Unified helper to find homeroom class for a teacher (User).
         * 1. Try active academic year first.
         * 2. Fallback: find latest by startDate (safe scalar sort, avoids
         * entity-ordering issue).
         */
        private Optional<ClassRoom> findHomeroomClass(User teacher) {
                if (teacher == null)
                        return Optional.empty();

                if (teacher.getSchool() != null) {
                        com.schoolmanagement.backend.domain.entity.admin.AcademicYear currentAcademicYear = semesterService
                                        .getActiveAcademicYearSafe(teacher.getSchool());

                        if (currentAcademicYear != null) {
                                Optional<ClassRoom> found = classRoomRepository
                                                .findByHomeroomTeacher_IdAndAcademicYear(teacher.getId(),
                                                                currentAcademicYear);
                                if (found.isPresent()) {
                                        return found;
                                }
                        }
                }

                // If not found in active year, look for ANY class with ACTIVE status for this
                // teacher
                List<ClassRoom> allHomerooms = classRoomRepository
                                .findAllBySchoolAndHomeroomTeacherIsNotNull(teacher.getSchool());
                return allHomerooms.stream()
                                .filter(c -> c.getHomeroomTeacher().getId().equals(teacher.getId()))
                                .filter(c -> c.getStatus() == com.schoolmanagement.backend.domain.classes.ClassRoomStatus.ACTIVE)
                                .findFirst()
                                .or(() -> classRoomRepository
                                                .findTopByHomeroomTeacher_IdOrderByAcademicYear_StartDateDesc(
                                                                teacher.getId()));
        }

        private List<TeacherProfileDto.AssignedClassDto> getAssignedClasses(User user) {
                com.schoolmanagement.backend.domain.entity.teacher.Teacher teacher = teacherRepository.findByUser(user)
                                .orElse(null);
                if (teacher == null)
                        return new ArrayList<>();

                List<com.schoolmanagement.backend.domain.entity.teacher.TeacherAssignment> assignments = teacherAssignmentRepository
                                .findAllByTeacher(teacher);

                com.schoolmanagement.backend.domain.entity.admin.AcademicYear activeYear = semesterService
                                .getActiveAcademicYearSafe(user.getSchool());

                return assignments.stream()
                                .filter(a -> a.getClassRoom() != null)
                                .filter(a -> activeYear == null || (a.getClassRoom().getAcademicYear() != null
                                                && a.getClassRoom().getAcademicYear().getId()
                                                                .equals(activeYear.getId())))
                                .map(a -> TeacherProfileDto.AssignedClassDto.builder()
                                                .classId(a.getClassRoom().getId().toString())
                                                .className(a.getClassRoom().getName())
                                                .subjectId(a.getSubject().getId().toString())
                                                .subjectName(a.getSubject().getName())
                                                .build())
                                .toList();
        }

        private int getAssignedClassCount(User teacher) {
                com.schoolmanagement.backend.domain.entity.teacher.Teacher teacherObj = teacherRepository
                                .findByUser(teacher)
                                .orElse(null);
                if (teacherObj == null)
                        return 0;
                return (int) teacherAssignmentRepository.countByTeacher(teacherObj);
        }

        private int getStudentCount(ClassRoom classRoom) {
                return (int) classEnrollmentRepository.countByClassRoom(classRoom);
        }

        // getCurrentAcademicYear() removed — now using
        // semesterService.getActiveAcademicYearName()

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
                                .averageGpa(0.0) // Set to 0 until real-time aggregation is implemented
                                .conductGrade("Chưa xếp loại")
                                .parentPhone(guardian != null ? guardian.getPhone() : null)
                                .parentEmail(guardian != null ? guardian.getEmail() : null)
                                .build();
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
                        log.warn("Could not calculate slot time for slot {}: {}", detail.getSlotIndex(),
                                        e.getMessage());
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

}
