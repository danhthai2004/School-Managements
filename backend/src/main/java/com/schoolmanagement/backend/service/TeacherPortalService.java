package com.schoolmanagement.backend.service;

import com.schoolmanagement.backend.domain.entity.ClassRoom;
import com.schoolmanagement.backend.domain.entity.User;
import com.schoolmanagement.backend.dto.teacher.*;
import com.schoolmanagement.backend.dto.TimetableScheduleSummaryDto.SlotTimeDto;
import com.schoolmanagement.backend.domain.entity.ClassEnrollment;
import com.schoolmanagement.backend.domain.entity.Student;
import com.schoolmanagement.backend.repo.ClassEnrollmentRepository;
import com.schoolmanagement.backend.repo.ClassRoomRepository;
import com.schoolmanagement.backend.repo.TeacherAssignmentRepository;
import com.schoolmanagement.backend.repo.TeacherRepository;
import com.schoolmanagement.backend.repo.TimetableDetailRepository;
import com.schoolmanagement.backend.repo.TimetableRepository;
import com.schoolmanagement.backend.repo.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.format.TextStyle;
import java.util.*;
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

        private static final String[] CONDUCT_GRADES = { "Xuất sắc", "Tốt", "Khá", "Trung bình", "Yếu" };

        /**
         * Get teacher profile with isHomeroomTeacher flag
         */
        public TeacherProfileDto getTeacherProfile(String email) {
                User teacher = findTeacherByEmail(email);
                String currentAcademicYear = getCurrentAcademicYear();

                log.info("=== Teacher Profile Debug ===");
                log.info("Teacher email: {}, User ID: {}", email, teacher.getId());
                log.info("Current academic year: {}", currentAcademicYear);

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
                                                        .present(studentCount > 0 ? studentCount - 2 : 0) // Mock: 2
                                                                                                          // absent
                                                        .total(studentCount)
                                                        .build())
                                        .studentsNeedingAttention(3) // Placeholder
                                        .averageGpa(7.8) // Placeholder
                                        .attendanceRate(92.0) // Placeholder
                                        .excellentStudents(12) // Placeholder
                                        .pendingAssignments(8); // Placeholder
                }

                return builder.build();
        }

        /**
         * Get today's schedule
         */
        public List<TodayScheduleItemDto> getTodaySchedule(String email) {
                User user = findTeacherByEmail(email);
                com.schoolmanagement.backend.domain.entity.Teacher teacher = teacherRepository.findByUser(user)
                                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                                                "Teacher profile not found"));

                // Get today's day of week
                LocalDate today = LocalDate.now();
                DayOfWeek dayOfWeek = today.getDayOfWeek();

                // Get official timetable
                Optional<com.schoolmanagement.backend.domain.entity.Timetable> timetableOpt = timetableRepository
                                .findFirstBySchoolAndStatusOrderByCreatedAtDesc(user.getSchool(),
                                                com.schoolmanagement.backend.domain.TimetableStatus.OFFICIAL);

                if (timetableOpt.isEmpty()) {
                        return List.of();
                }

                // Get details for teacher
                List<com.schoolmanagement.backend.domain.entity.TimetableDetail> details = timetableDetailRepository
                                .findAllByTimetableAndTeacher(timetableOpt.get(), teacher);

                return details.stream()
                                .filter(d -> d.getDayOfWeek() == dayOfWeek)
                                .sorted(Comparator.comparingInt(
                                                com.schoolmanagement.backend.domain.entity.TimetableDetail::getSlotIndex))
                                .map(this::mapToTodayScheduleItemDto)
                                .toList();
        }

        /**
         * Get weekly schedule
         */
        public List<com.schoolmanagement.backend.dto.TimetableDetailDto> getWeeklySchedule(String email) {
                User user = findTeacherByEmail(email);
                com.schoolmanagement.backend.domain.entity.Teacher teacher = teacherRepository.findByUser(user)
                                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                                                "Teacher profile not found"));

                // Get official timetable
                Optional<com.schoolmanagement.backend.domain.entity.Timetable> timetableOpt = timetableRepository
                                .findFirstBySchoolAndStatusOrderByCreatedAtDesc(user.getSchool(),
                                                com.schoolmanagement.backend.domain.TimetableStatus.OFFICIAL);

                if (timetableOpt.isEmpty()) {
                        return List.of();
                }

                // Get slot times for this school
                List<SlotTimeDto> slotTimes = settingsService.getAllSlotTimes(user.getSchool());
                Map<Integer, SlotTimeDto> slotTimeMap = slotTimes.stream()
                                .collect(Collectors.toMap(SlotTimeDto::getSlotIndex, s -> s));

                // Get details for teacher
                List<com.schoolmanagement.backend.domain.entity.TimetableDetail> details = timetableDetailRepository
                                .findAllByTimetableAndTeacher(timetableOpt.get(), teacher);

                return details.stream()
                                .map(d -> {
                                        SlotTimeDto slotTime = slotTimeMap.get(d.getSlotIndex());
                                        return new com.schoolmanagement.backend.dto.TimetableDetailDto(
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
                                                        0,
                                                        slotTime != null ? slotTime.getStartTime() : null,
                                                        slotTime != null ? slotTime.getEndTime() : null);
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
                String currentAcademicYear = getCurrentAcademicYear();

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
                Optional<ClassRoom> homeroomClass = classRoomRepository.findByHomeroomTeacher(teacher);

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
                Optional<ClassRoom> homeroomClass = classRoomRepository.findByHomeroomTeacher(teacher);

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

        private List<TeacherProfileDto.AssignedClassDto> getAssignedClasses(User teacher) {
                // TODO: Query actual teacher assignments
                return new ArrayList<>();
        }

        private int getAssignedClassCount(User teacher) {
                // TODO: Count from teacher assignments
                return 5; // Placeholder
        }

        private int getTodayPeriodCount(User teacher) {
                // TODO: Query from timetable for today
                return 4; // Placeholder
        }

        private int getStudentCount(ClassRoom classRoom) {
                String currentAcademicYear = getCurrentAcademicYear();
                List<ClassEnrollment> enrollments = classEnrollmentRepository
                                .findAllByClassRoomAndAcademicYear(classRoom, currentAcademicYear);
                return enrollments.size();
        }

        private String getCurrentAcademicYear() {
                int year = LocalDate.now().getYear();
                int month = LocalDate.now().getMonthValue();
                // Academic year starts in September
                return month >= 9 ? year + "-" + (year + 1) : (year - 1) + "-" + year;
        }

        private HomeroomStudentDto mapToHomeroomStudentDto(Student student) {
                Random random = new Random(student.getId().hashCode()); // Deterministic random for same student
                return HomeroomStudentDto.builder()
                                .id(student.getId().toString())
                                .studentCode(student.getStudentCode())
                                .fullName(student.getFullName())
                                .gender(student.getGender() != null ? student.getGender().name() : null)
                                .email(student.getEmail())
                                .phone(student.getPhone())
                                .avatarUrl(student.getAvatarUrl())
                                .status(student.getStatus().name())
                                // Mock values - will be replaced when grade/attendance systems are implemented
                                .attendanceRate(85.0 + random.nextDouble() * 15) // 85-100%
                                .averageGpa(5.0 + random.nextDouble() * 5) // 5.0-10.0
                                .conductGrade(CONDUCT_GRADES[random.nextInt(CONDUCT_GRADES.length)])
                                .parentPhone(student.getPhone() != null ? "0" + (900000000 + random.nextInt(99999999))
                                                : null)
                                .parentEmail(student.getEmail() != null ? "parent." + student.getEmail() : null)
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
                        com.schoolmanagement.backend.domain.entity.TimetableDetail detail) {
                int slot = detail.getSlotIndex();
                // Simple mapping for demo: assume morning slots 1-5 starting 7:00
                // 45 mins per slot, 5 mins break
                // Slot 1: 07:00 - 07:45
                // Slot 2: 07:50 - 08:35
                // Slot 3: 08:50 - 09:35 (15 min break after slot 2)
                // Slot 4: 09:40 - 10:25
                // Slot 5: 10:30 - 11:15

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
                        } // Afternoon start
                        default -> {
                                start = "Slot " + slot;
                                end = "";
                        }
                }

                return TodayScheduleItemDto.builder()
                                .periodNumber(slot)
                                .subjectName(detail.getSubject().getName())
                                .className(detail.getClassRoom().getName())
                                .roomNumber(detail.getClassRoom().getName()) // Use class name as room for now if room
                                                                             // not separate
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
