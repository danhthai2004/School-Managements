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
// // import java.util.*;
import java.util.stream.Collectors;

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

                LocalDate today = LocalDate.now();

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
                // Use safe version to avoid crashing when no ACTIVE academic year exists
                com.schoolmanagement.backend.domain.entity.admin.AcademicYear currentAcademicYear = semesterService.getActiveAcademicYearSafe(teacher.getSchool());

                log.info("=== Teacher Profile Debug ===");
                log.info("Teacher email: {}, User ID: {}", email, teacher.getId());
                log.info("Current academic year: {}", currentAcademicYear != null ? currentAcademicYear.getName() : "null");

                Optional<ClassRoom> homeroomClass = findHomeroomClass(teacher);

                if (homeroomClass.isPresent()) {
                        log.info("SUCCESS - Homeroom class: {} | ID: {} | Year: {}",
                                        homeroomClass.get().getName(),
                                        homeroomClass.get().getId(),
                                        homeroomClass.get().getAcademicYear() != null
                                                ? homeroomClass.get().getAcademicYear().getName() : "N/A");
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
                Optional<ClassRoom> homeroomClass = findHomeroomClass(teacher);
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
                                                        .present(studentCount > 0 ? studentCount - 2 : 0)
                                                        .total(studentCount)
                                                        .build())
                                        .studentsNeedingAttention(3)
                                        .averageGpa(7.8)
                                        .attendanceRate(92.0)
                                        .excellentStudents(12)
                                        .pendingAssignments(8);
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

                // Get today's day of week
                LocalDate today = LocalDate.now();
                DayOfWeek dayOfWeek = today.getDayOfWeek();

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
                                .sorted(Comparator.comparingInt(
                                                com.schoolmanagement.backend.domain.entity.timetable.TimetableDetail::getSlotIndex))
                                .map(this::mapToTodayScheduleItemDto)
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

                return details.stream()
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
                Optional<ClassRoom> homeroomClass = findHomeroomClass(teacher);

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
         * Get AI risk analysis (homeroom only, placeholder data)
         */
        public List<StudentRiskAnalysisDto> getRiskAnalysis(String email) {
                User teacher = findTeacherByEmail(email);
                Optional<ClassRoom> homeroomClass = findHomeroomClass(teacher);

                if (homeroomClass.isEmpty()) {
                        throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                                        "Only homeroom teachers can access risk analysis");
                }

                // Return placeholder data for AI features
                return getMockRiskAnalysis();
        }

        /**
         * Get AI recommendations (homeroom only, placeholder data)
         */
        public List<AIRecommendationDto> getRecommendations(String email) {
                User teacher = findTeacherByEmail(email);
                Optional<ClassRoom> homeroomClass = findHomeroomClass(teacher);

                if (homeroomClass.isEmpty()) {
                        throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                                        "Only homeroom teachers can access AI recommendations");
                }

                // Return placeholder data for AI features
                return getMockRecommendations();
        }

        // ==================== HELPER METHODS ====================

        private User findTeacherByEmail(String email) {
                return userRepository.findByEmailIgnoreCase(email)
                                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                                                "Teacher not found: " + email));
        }

        /**
         * Unified helper to find homeroom class for a teacher (User).
         * 1. Try active academic year first.
         * 2. Fallback: find latest by startDate (safe scalar sort, avoids entity-ordering issue).
         */
        private Optional<ClassRoom> findHomeroomClass(User teacher) {
                // Step 1: try current active academic year
                com.schoolmanagement.backend.domain.entity.admin.AcademicYear currentAcademicYear =
                                semesterService.getActiveAcademicYearSafe(teacher.getSchool());

                if (currentAcademicYear != null) {
                        Optional<ClassRoom> found = classRoomRepository
                                        .findByHomeroomTeacher_IdAndAcademicYear(teacher.getId(), currentAcademicYear);
                        log.debug("findHomeroomClass (active year {}): {}", currentAcademicYear.getName(), found.isPresent());
                        if (found.isPresent()) return found;
                }

                // Step 2: fallback — latest by academic year startDate
                Optional<ClassRoom> fallback = classRoomRepository
                                .findTopByHomeroomTeacher_IdOrderByAcademicYear_StartDateDesc(teacher.getId());
                log.debug("findHomeroomClass (fallback latest): {}", fallback.isPresent());
                return fallback;
        }

        private List<TeacherProfileDto.AssignedClassDto> getAssignedClasses(User user) {
                com.schoolmanagement.backend.domain.entity.teacher.Teacher teacher = teacherRepository.findByUser(user)
                                .orElse(null);
                if (teacher == null)
                        return new ArrayList<>();

                List<com.schoolmanagement.backend.domain.entity.teacher.TeacherAssignment> assignments = teacherAssignmentRepository
                                .findAllByTeacher(teacher);

                return assignments.stream()
                                .filter(a -> a.getClassRoom() != null)
                                .map(a -> TeacherProfileDto.AssignedClassDto.builder()
                                                .classId(a.getClassRoom().getId().toString())
                                                .className(a.getClassRoom().getName())
                                                .subjectId(a.getSubject().getId().toString())
                                                .subjectName(a.getSubject().getName())
                                                .build())
                                .toList();
        }


        private int getAssignedClassCount(User teacher) {
                return 5; // Placeholder
        }

        private int getTodayPeriodCount(User teacher) {
                return 4; // Placeholder
        }

        private int getStudentCount(ClassRoom classRoom) {
                com.schoolmanagement.backend.domain.entity.admin.AcademicYear currentAcademicYear = classRoom.getAcademicYear();
                List<ClassEnrollment> enrollments = classEnrollmentRepository
                                .findAllByClassRoomAndAcademicYear(classRoom, currentAcademicYear);
                return enrollments.size();
        }

        // getCurrentAcademicYear() removed — now using semesterService.getActiveAcademicYearName()

        private HomeroomStudentDto mapToHomeroomStudentDto(Student student) {
                Random random = new Random(student.getId().hashCode());
                return HomeroomStudentDto.builder()
                                .id(student.getId().toString())
                                .studentCode(student.getStudentCode())
                                .fullName(student.getFullName())
                                .gender(student.getGender() != null ? student.getGender().name() : null)
                                .email(student.getEmail())
                                .phone(student.getPhone())
                                .avatarUrl(student.getAvatarUrl())
                                .status(student.getStatus().name())
                                .attendanceRate(85.0 + random.nextDouble() * 15)
                                .averageGpa(5.0 + random.nextDouble() * 5)
                                .conductGrade(CONDUCT_GRADES[random.nextInt(CONDUCT_GRADES.length)])
                                .parentPhone(student.getPhone() != null ? "0" + (900000000 + random.nextInt(99999999))
                                                : null)
                                .parentEmail(student.getEmail() != null ? "parent." + student.getEmail() : null)
                                .build();
        }

        private TodayScheduleItemDto mapToTodayScheduleItemDto(
                        com.schoolmanagement.backend.domain.entity.timetable.TimetableDetail detail) {
                int slot = detail.getSlotIndex();
                String start = "";
                String end = "";

                switch (slot) {
                        case 1 -> {
                                start = "07:00";
                                end = "07:45";
                        }
                        case 2 -> {
                                start = "07:50";
                                end = "08:35";
                        }
                        case 3 -> {
                                start = "08:50";
                                end = "09:35";
                        }
                        case 4 -> {
                                start = "09:40";
                                end = "10:25";
                        }
                        case 5 -> {
                                start = "10:30";
                                end = "11:15";
                        }
                        case 6 -> {
                                start = "12:30";
                                end = "13:15";
                        }
                        default -> {
                                start = "Slot " + slot;
                                end = "";
                        }
                }

                return TodayScheduleItemDto.builder()
                                .periodNumber(slot)
                                .subjectName(detail.getSubject().getName())
                                .className(detail.getClassRoom().getName())
                                .roomNumber(detail.getClassRoom().getRoom() != null
                                                ? detail.getClassRoom().getRoom().getName()
                                                : "Chưa gán")
                                .startTime(start)
                                .endTime(end)
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
