package com.schoolmanagement.backend.service;

import com.schoolmanagement.backend.domain.*;
import com.schoolmanagement.backend.domain.entity.*;
import com.schoolmanagement.backend.dto.student.*;
import com.schoolmanagement.backend.exception.ApiException;
import com.schoolmanagement.backend.repo.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Service for student portal functionality.
 * Provides data for logged-in students to view their profile, timetable, scores, etc.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class StudentPortalService {

    private final UserRepository userRepository;
    private final StudentRepository studentRepository;
    private final ClassEnrollmentRepository classEnrollmentRepository;
    private final TimetableRepository timetableRepository;
    private final TimetableDetailRepository timetableDetailRepository;
    private final ScoreRepository scoreRepository;
    private final AttendanceRepository attendanceRepository;
    private final ExamScheduleRepository examScheduleRepository;

    /**
     * Get the student profile for the logged-in user.
     */
    @Transactional(readOnly = true)
    public StudentProfileDto getProfile(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User không tồn tại"));

        if (user.getRole() != Role.STUDENT) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Chỉ học sinh mới có quyền truy cập");
        }

        // Find the student record linked to this user
        Student student = studentRepository.findByUserIdWithDetails(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy hồ sơ học sinh"));

        // Get current class enrollment
        String currentAcademicYear = getCurrentAcademicYear();
        ClassEnrollment enrollment = classEnrollmentRepository
                .findByStudentAndAcademicYear(student, currentAcademicYear)
                .orElse(null);

        return StudentProfileDto.builder()
                .id(student.getId().toString())
                .studentCode(student.getStudentCode())
                .fullName(student.getFullName())
                .email(student.getEmail())
                .phone(student.getPhone())
                .avatarUrl(student.getAvatarUrl())
                .classId(enrollment != null ? enrollment.getClassRoom().getId().toString() : null)
                .className(enrollment != null ? enrollment.getClassRoom().getName() : null)
                .grade(enrollment != null ? enrollment.getClassRoom().getGrade() : null)
                .academicYear(currentAcademicYear)
                .build();
    }

    /**
     * Get the timetable for the student's current class.
     */
    @Transactional(readOnly = true)
    public StudentTimetableDto getTimetable(UUID userId) {
        Student student = getStudentForUser(userId);
        String currentAcademicYear = getCurrentAcademicYear();
        int currentSemester = getCurrentSemester();

        // Get current class enrollment
        ClassEnrollment enrollment = classEnrollmentRepository
                .findByStudentAndAcademicYear(student, currentAcademicYear)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Học sinh chưa được xếp lớp"));

        ClassRoom classRoom = enrollment.getClassRoom();

        // Find official timetable for this semester
        List<Timetable> timetables = timetableRepository
                .findAllBySchoolAndAcademicYearAndSemester(student.getSchool(), currentAcademicYear, currentSemester);

        Timetable officialTimetable = timetables.stream()
                .filter(t -> t.getStatus() == TimetableStatus.OFFICIAL)
                .findFirst()
                .orElse(null);

        // Fallback: If no official timetable for current semester, find any OFFICIAL timetable for this school
        if (officialTimetable == null) {
            List<Timetable> allSchoolTimetables = timetableRepository
                    .findAllBySchoolOrderByCreatedAtDesc(student.getSchool());
            officialTimetable = allSchoolTimetables.stream()
                    .filter(t -> t.getStatus() == TimetableStatus.OFFICIAL)
                    .findFirst()
                    .orElse(null);
        }

        List<TimetableSlotDto> slots = new ArrayList<>();
        if (officialTimetable != null) {
            List<TimetableDetail> details = timetableDetailRepository
                    .findAllByTimetableAndClassRoom(officialTimetable, classRoom);

            slots = details.stream()
                    .map(this::toSlotDto)
                    .sorted(Comparator.comparingInt(TimetableSlotDto::getDayOfWeek)
                            .thenComparingInt(TimetableSlotDto::getPeriod))
                    .collect(Collectors.toList());
        }

        return StudentTimetableDto.builder()
                .classId(classRoom.getId().toString())
                .className(classRoom.getName())
                .academicYear(currentAcademicYear)
                .semester(currentSemester)
                .slots(slots)
                .build();
    }

    /**
     * Get today's schedule for the student.
     */
    @Transactional(readOnly = true)
    public List<TimetableSlotDto> getTodaySchedule(UUID userId) {
        StudentTimetableDto timetable = getTimetable(userId);
        int todayDayOfWeek = getTodayDayOfWeek();

        return timetable.getSlots().stream()
                .filter(slot -> slot.getDayOfWeek() == todayDayOfWeek)
                .sorted(Comparator.comparingInt(TimetableSlotDto::getPeriod))
                .collect(Collectors.toList());
    }

    /**
     * Get exam schedule for the student.
     * Performed by guardian role
     * Fetches from database, returns empty list if no records exist.
     * Supports filtering by academic year and semester.
     */
    @Transactional(readOnly = true)
    public List<ExamScheduleDto> getExamScheduleStudent(UUID studentId, String academicYear, Integer semester) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Học sinh không tồn tại"));
        String targetAcademicYear = (academicYear != null && !academicYear.isEmpty())
                ? academicYear
                : getCurrentAcademicYear();

        // Get enrollment for target academic year
        ClassEnrollment enrollment = classEnrollmentRepository
                .findByStudentAndAcademicYear(student, targetAcademicYear)
                .orElse(null);

        // If no enrollment for target year, try to find any enrollment for this student
        if (enrollment == null) {
            List<ClassEnrollment> allEnrollments = classEnrollmentRepository.findAllByStudent(student);
            if (!allEnrollments.isEmpty()) {
                // Use the most recent enrollment
                enrollment = allEnrollments.stream()
                        .max((e1, e2) -> e1.getAcademicYear().compareTo(e2.getAcademicYear()))
                        .orElse(null);
            }
        }

        if (enrollment == null) {
            log.info("No enrollment found for student: {}", student.getId());
            return new ArrayList<>(); // Return empty list instead of mock data
        }

        // Get exams based on filters - only use the specified filters, don't fallback
        List<ExamSchedule> exams;
        if (semester != null) {
            exams = examScheduleRepository.findByClassRoomAndAcademicYearAndSemester(
                    enrollment.getClassRoom(), targetAcademicYear, semester);
        } else {
            exams = examScheduleRepository.findByClassRoomAndAcademicYear(
                    enrollment.getClassRoom(), targetAcademicYear);
        }

        if (exams.isEmpty()) {
            log.info("No exams found for classroom: {} with year: {} semester: {}",
                    enrollment.getClassRoom().getName(), targetAcademicYear, semester);
            return new ArrayList<>(); // Return empty list instead of mock data
        }

        LocalDate today = LocalDate.now();
        return exams.stream()
                .map(e -> toExamScheduleDto(e, today))
                .sorted((a, b) -> a.getExamDate().compareTo(b.getExamDate()))
                .collect(Collectors.toList());
    }

    /**
     * Get exam schedule for the student.
     * Fetches from database, returns empty list if no records exist.
     * Supports filtering by academic year and semester.
     */
    @Transactional(readOnly = true)
    public List<ExamScheduleDto> getExamSchedule(UUID userId, String academicYear, Integer semester) {
        Student student = getStudentForUser(userId);
        if (student == null) student = studentRepository.findById(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Học sinh không tồn tại"));
        String targetAcademicYear = (academicYear != null && !academicYear.isEmpty())
                ? academicYear 
                : getCurrentAcademicYear();

        // Get enrollment for target academic year
        ClassEnrollment enrollment = classEnrollmentRepository
                .findByStudentAndAcademicYear(student, targetAcademicYear)
                .orElse(null);

        // If no enrollment for target year, try to find any enrollment for this student
        if (enrollment == null) {
            List<ClassEnrollment> allEnrollments = classEnrollmentRepository.findAllByStudent(student);
            if (!allEnrollments.isEmpty()) {
                // Use the most recent enrollment
                enrollment = allEnrollments.stream()
                        .max((e1, e2) -> e1.getAcademicYear().compareTo(e2.getAcademicYear()))
                        .orElse(null);
            }
        }

        if (enrollment == null) {
            log.info("No enrollment found for student: {}", student.getId());
            return new ArrayList<>(); // Return empty list instead of mock data
        }

        // Get exams based on filters - only use the specified filters, don't fallback
        List<ExamSchedule> exams;
        if (semester != null) {
            exams = examScheduleRepository.findByClassRoomAndAcademicYearAndSemester(
                    enrollment.getClassRoom(), targetAcademicYear, semester);
        } else {
            exams = examScheduleRepository.findByClassRoomAndAcademicYear(
                    enrollment.getClassRoom(), targetAcademicYear);
        }

        if (exams.isEmpty()) {
            log.info("No exams found for classroom: {} with year: {} semester: {}", 
                    enrollment.getClassRoom().getName(), targetAcademicYear, semester);
            return new ArrayList<>(); // Return empty list instead of mock data
        }

        LocalDate today = LocalDate.now();
        return exams.stream()
                .map(e -> toExamScheduleDto(e, today))
                .sorted((a, b) -> a.getExamDate().compareTo(b.getExamDate()))
                .collect(Collectors.toList());
    }
    
    /**
     * Get exam schedule with default parameters (overload for backward compatibility).
     */
    @Transactional(readOnly = true)
    public List<ExamScheduleDto> getExamSchedule(UUID userId) {
        return getExamSchedule(userId, null, null);
    }

    /**
     * Get scores for the student.
     * Fetches from database, falls back to sample data if no records exist.
     */
    @Transactional(readOnly = true)
    public List<ScoreDto> getScores(UUID userId, Integer semester) {
        Student student = getStudentForUser(userId);
        String currentAcademicYear = getCurrentAcademicYear();
        int targetSemester = semester != null ? semester : getCurrentSemester();

        List<Score> scores = scoreRepository
                .findByStudentAndAcademicYearAndSemester(student, currentAcademicYear, targetSemester);

        if (scores.isEmpty()) {
            return generateSampleScores();
        }

        // Group scores by subject and calculate averages
        Map<UUID, List<Score>> scoresBySubject = scores.stream()
                .collect(Collectors.groupingBy(s -> s.getSubject().getId()));

        return scoresBySubject.entrySet().stream()
                .map(entry -> calculateSubjectScores(entry.getKey(), entry.getValue()))
                .sorted(Comparator.comparing(ScoreDto::getSubjectName))
                .collect(Collectors.toList());
    }

    /**
     * Get attendance summary for the student.
     * Fetches from database, falls back to sample data if no records exist.
     */
    @Transactional(readOnly = true)
    public AttendanceSummaryDto getAttendance(UUID userId, Integer month, Integer year) {
        Student student = getStudentForUser(userId);
        
        // Default to current month/year if not specified
        LocalDate now = LocalDate.now();
        int targetMonth = month != null ? month : now.getMonthValue();
        int targetYear = year != null ? year : now.getYear();

        List<Attendance> attendances = attendanceRepository
                .findByStudentAndMonthAndYear(student, targetMonth, targetYear);

        if (attendances.isEmpty()) {
            return generateSampleAttendance();
        }

        int totalDays = attendances.size();
        long presentDays = attendances.stream()
                .filter(a -> a.getStatus() == AttendanceStatus.PRESENT)
                .count();
        long absentDays = attendances.stream()
                .filter(a -> a.getStatus() == AttendanceStatus.ABSENT)
                .count();
        long lateDays = attendances.stream()
                .filter(a -> a.getStatus() == AttendanceStatus.LATE)
                .count();
        
        double attendanceRate = totalDays > 0 
                ? Math.round((presentDays + lateDays) * 1000.0 / totalDays) / 10.0 
                : 0.0;

        List<AttendanceRecordDto> records = attendances.stream()
                .map(this::toAttendanceRecordDto)
                .collect(Collectors.toList());

        return AttendanceSummaryDto.builder()
                .totalDays(totalDays)
                .presentDays((int) presentDays)
                .absentDays((int) absentDays)
                .lateDays((int) lateDays)
                .attendanceRate(attendanceRate)
                .records(records)
                .build();
    }

    /**
     * Get dashboard data for the student overview page.
     */
    @Transactional(readOnly = true)
    public StudentDashboardDto getDashboard(UUID userId) {
        StudentProfileDto profile = getProfile(userId);
        List<TimetableSlotDto> todaySchedule = getTodaySchedule(userId);
        List<ExamScheduleDto> upcomingExams = getExamSchedule(userId).stream()
                .filter(e -> "UPCOMING".equals(e.getStatus()))
                .limit(3)
                .collect(Collectors.toList());
        List<ScoreDto> scores = getScores(userId, null);

        // Calculate average score
        Double avgScore = scores.stream()
                .filter(s -> s.getAverageScore() != null)
                .mapToDouble(ScoreDto::getAverageScore)
                .average()
                .orElse(0.0);

        AttendanceSummaryDto attendance = getAttendance(userId, null, null);

        return StudentDashboardDto.builder()
                .profile(profile)
                .averageScore(Math.round(avgScore * 10.0) / 10.0)
                .totalSubjects(scores.size())
                .attendanceRate(attendance.getAttendanceRate())
                .absences(attendance.getAbsentDays())
                .semester("Học kỳ " + getCurrentSemester() + " - " + getCurrentAcademicYear())
                .todaySchedule(todaySchedule)
                .upcomingExams(upcomingExams)
                .build();
    }

    /**
     * Get detailed learning analysis and statistics for the student.
     */
    @Transactional(readOnly = true)
    public StudentAnalysisDto getAnalysis(UUID userId) {
        Student student = getStudentForUser(userId);
        String currentAcademicYear = getCurrentAcademicYear();
        int currentSemester = getCurrentSemester();

        // Get profile info
        StudentProfileDto profile = getProfile(userId);

        // Get all scores for current semester
        List<ScoreDto> scores = getScores(userId, currentSemester);

        // Calculate score statistics
        Double overallAverage = 0.0;
        Double highestScore = 0.0;
        Double lowestScore = 10.0;
        String bestSubject = "";
        String worstSubject = "";

        int excellentCount = 0;
        int goodCount = 0;
        int averageCount = 0;
        int belowAverageCount = 0;

        List<StudentAnalysisDto.SubjectScoreSummary> subjectScores = new ArrayList<>();

        if (!scores.isEmpty()) {
            double totalScore = 0;
            int validCount = 0;

            for (ScoreDto score : scores) {
                Double avg = score.getAverageScore();
                if (avg != null) {
                    totalScore += avg;
                    validCount++;

                    if (avg > highestScore) {
                        highestScore = avg;
                        bestSubject = score.getSubjectName();
                    }
                    if (avg < lowestScore) {
                        lowestScore = avg;
                        worstSubject = score.getSubjectName();
                    }

                    // Count by category
                    if (avg >= 8.5) excellentCount++;
                    else if (avg >= 7.0) goodCount++;
                    else if (avg >= 5.0) averageCount++;
                    else belowAverageCount++;

                    // Create subject summary
                    String performance;
                    if (avg >= 8.5) performance = "EXCELLENT";
                    else if (avg >= 7.0) performance = "GOOD";
                    else if (avg >= 5.0) performance = "AVERAGE";
                    else performance = "BELOW_AVERAGE";

                    subjectScores.add(StudentAnalysisDto.SubjectScoreSummary.builder()
                            .subjectId(score.getSubjectId())
                            .subjectName(score.getSubjectName())
                            .averageScore(avg)
                            .performance(performance)
                            .trend(0.0) // TODO: Calculate trend from historical data
                            .build());
                }
            }

            if (validCount > 0) {
                overallAverage = Math.round(totalScore / validCount * 10.0) / 10.0;
            }
        }

        // Get attendance summary
        AttendanceSummaryDto attendance = getAttendance(userId, null, null);

        // Build and return analysis
        return StudentAnalysisDto.builder()
                .studentId(student.getId().toString())
                .studentName(student.getFullName())
                .className(profile.getClassName())
                .academicYear(currentAcademicYear)
                .semester(currentSemester)
                .overallAverage(overallAverage)
                .highestScore(highestScore)
                .lowestScore(lowestScore > highestScore ? 0.0 : lowestScore)
                .bestSubject(bestSubject)
                .worstSubject(worstSubject)
                .excellentCount(excellentCount)
                .goodCount(goodCount)
                .averageCount(averageCount)
                .belowAverageCount(belowAverageCount)
                .subjectScores(subjectScores)
                .totalAttendanceDays(attendance.getTotalDays())
                .presentDays(attendance.getPresentDays())
                .absentDays(attendance.getAbsentDays())
                .lateDays(attendance.getLateDays())
                .attendanceRate(attendance.getAttendanceRate())
                .monthlyPerformance(new ArrayList<>()) // TODO: Implement monthly trends
                .classRank(null) // TODO: Implement ranking
                .totalStudentsInClass(null)
                .build();
    }

    // ==================== Helper Methods ====================

    private Student getStudentForUser(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User không tồn tại"));

        if (user.getRole() != Role.STUDENT) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Chỉ học sinh mới có quyền truy cập");
        }

        return studentRepository.findByUserIdWithDetails(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy hồ sơ học sinh"));
    }

    private TimetableSlotDto toSlotDto(TimetableDetail detail) {
        // Convert Java DayOfWeek (MONDAY=1) to Vietnamese convention (2=Mon, 3=Tue, ..., 7=Sat)
        int dayOfWeek = detail.getDayOfWeek().getValue() + 1; // MONDAY(1) -> 2, TUESDAY(2) -> 3, etc.
        if (dayOfWeek == 8) dayOfWeek = 8; // SUNDAY would be 8, but schools typically don't have Sunday

        return TimetableSlotDto.builder()
                .id(detail.getId().toString())
                .dayOfWeek(dayOfWeek)
                .period(detail.getSlotIndex())
                .subjectName(detail.getSubject().getName())
                .teacherName(detail.getTeacher() != null ? detail.getTeacher().getFullName() : "Chưa phân công")
                .room(detail.getClassRoom().getRoomNumber())
                .build();
    }

    private String getCurrentAcademicYear() {
        LocalDate now = LocalDate.now();
        int year = now.getYear();
        int month = now.getMonthValue();

        // Academic year starts in September
        if (month >= 9) {
            return year + "-" + (year + 1);
        } else {
            return (year - 1) + "-" + year;
        }
    }

    private int getCurrentSemester() {
        LocalDate now = LocalDate.now();
        int month = now.getMonthValue();

        // Semester 1: Sep-Jan, Semester 2: Feb-Jun
        if (month >= 9 || month <= 1) {
            return 1;
        } else {
            return 2;
        }
    }

    private int getTodayDayOfWeek() {
        DayOfWeek dow = LocalDate.now().getDayOfWeek();
        // Convert to Vietnamese convention: Monday=2, Tuesday=3, ..., Sunday=8
        return dow.getValue() + 1;
    }

    private ExamScheduleDto toExamScheduleDto(ExamSchedule exam, LocalDate today) {
        String status;
        if (exam.getStatus() == ExamStatus.COMPLETED || exam.getStatus() == ExamStatus.CANCELLED) {
            status = exam.getStatus().name();
        } else if (exam.getExamDate().isBefore(today)) {
            status = "COMPLETED";
        } else {
            status = "UPCOMING";
        }

        return ExamScheduleDto.builder()
                .id(exam.getId().toString())
                .subjectName(exam.getSubject().getName())
                .examDate(exam.getExamDate().toString())
                .startTime(exam.getStartTime().toString())
                .duration(exam.getDuration())
                .examType(exam.getExamType().name())
                .room(exam.getRoomNumber())
                .status(status)
                .note(exam.getNote())
                .build();
    }

    private ScoreDto calculateSubjectScores(UUID subjectId, List<Score> scores) {
        if (scores.isEmpty()) {
            return null;
        }

        String subjectName = scores.get(0).getSubject().getName();
        
        Double oralScore = getScoreByType(scores, ScoreType.ORAL);
        Double test15Score = getScoreByType(scores, ScoreType.TEST_15);
        Double test45Score = getScoreByType(scores, ScoreType.TEST_45);
        Double midtermScore = getScoreByType(scores, ScoreType.MIDTERM);
        Double finalScore = getScoreByType(scores, ScoreType.FINAL);

        // Calculate weighted average
        // Weights: Oral=1, Test15=1, Test45=2, Midterm=2, Final=3
        double totalWeight = 0;
        double weightedSum = 0;

        if (oralScore != null) { weightedSum += oralScore * 1; totalWeight += 1; }
        if (test15Score != null) { weightedSum += test15Score * 1; totalWeight += 1; }
        if (test45Score != null) { weightedSum += test45Score * 2; totalWeight += 2; }
        if (midtermScore != null) { weightedSum += midtermScore * 2; totalWeight += 2; }
        if (finalScore != null) { weightedSum += finalScore * 3; totalWeight += 3; }

        Double averageScore = totalWeight > 0 
                ? Math.round(weightedSum / totalWeight * 10.0) / 10.0 
                : null;

        return ScoreDto.builder()
                .subjectId(subjectId.toString())
                .subjectName(subjectName)
                .oralScore(oralScore)
                .test15Score(test15Score)
                .test45Score(test45Score)
                .midtermScore(midtermScore)
                .finalScore(finalScore)
                .averageScore(averageScore)
                .build();
    }

    private Double getScoreByType(List<Score> scores, ScoreType type) {
        return scores.stream()
                .filter(s -> s.getScoreType() == type)
                .findFirst()
                .map(Score::getValue)
                .orElse(null);
    }

    private AttendanceRecordDto toAttendanceRecordDto(Attendance attendance) {
        return AttendanceRecordDto.builder()
                .date(attendance.getAttendanceDate().toString())
                .status(attendance.getStatus().name())
                .note(attendance.getNote())
                .build();
    }

    // ==================== Sample Data Generators ====================

    private List<ExamScheduleDto> generateSampleExamSchedule() {
        LocalDate today = LocalDate.now();
        return List.of(
                ExamScheduleDto.builder()
                        .id("1")
                        .subjectName("Toán")
                        .examDate(today.plusDays(3).toString())
                        .startTime("07:30")
                        .duration(90)
                        .examType("MIDTERM")
                        .room("P.101")
                        .status("UPCOMING")
                        .note("Mang theo máy tính cầm tay")
                        .build(),
                ExamScheduleDto.builder()
                        .id("2")
                        .subjectName("Văn")
                        .examDate(today.plusDays(5).toString())
                        .startTime("07:30")
                        .duration(15)
                        .examType("QUIZ")
                        .room("P.301")
                        .status("UPCOMING")
                        .note(null)
                        .build(),
                ExamScheduleDto.builder()
                        .id("3")
                        .subjectName("Anh")
                        .examDate(today.plusDays(7).toString())
                        .startTime("07:30")
                        .duration(60)
                        .examType("MIDTERM")
                        .room("P.102")
                        .status("UPCOMING")
                        .note("Mang theo từ điển Anh-Việt")
                        .build(),
                ExamScheduleDto.builder()
                        .id("4")
                        .subjectName("Lý")
                        .examDate(today.plusDays(10).toString())
                        .startTime("09:00")
                        .duration(45)
                        .examType("REGULAR")
                        .room("P.Lab1")
                        .status("UPCOMING")
                        .note(null)
                        .build(),
                ExamScheduleDto.builder()
                        .id("5")
                        .subjectName("Sinh")
                        .examDate(today.minusDays(5).toString())
                        .startTime("07:30")
                        .duration(15)
                        .examType("QUIZ")
                        .room("P.301")
                        .status("COMPLETED")
                        .note(null)
                        .build()
        );
    }

    private List<ScoreDto> generateSampleScores() {
        return List.of(
                ScoreDto.builder().subjectId("1").subjectName("Toán").oralScore(8.5).test15Score(8.0).test45Score(7.5).midtermScore(8.0).finalScore(null).averageScore(8.0).build(),
                ScoreDto.builder().subjectId("2").subjectName("Văn").oralScore(7.0).test15Score(7.5).test45Score(8.0).midtermScore(7.5).finalScore(null).averageScore(7.5).build(),
                ScoreDto.builder().subjectId("3").subjectName("Anh").oralScore(9.0).test15Score(8.5).test45Score(9.0).midtermScore(9.0).finalScore(null).averageScore(8.9).build(),
                ScoreDto.builder().subjectId("4").subjectName("Lý").oralScore(8.0).test15Score(7.0).test45Score(8.5).midtermScore(8.0).finalScore(null).averageScore(7.9).build(),
                ScoreDto.builder().subjectId("5").subjectName("Hóa").oralScore(7.5).test15Score(8.0).test45Score(7.0).midtermScore(7.5).finalScore(null).averageScore(7.5).build(),
                ScoreDto.builder().subjectId("6").subjectName("Sinh").oralScore(8.0).test15Score(8.5).test45Score(8.0).midtermScore(null).finalScore(null).averageScore(8.2).build(),
                ScoreDto.builder().subjectId("7").subjectName("Sử").oralScore(7.0).test15Score(7.5).test45Score(null).midtermScore(null).finalScore(null).averageScore(7.3).build(),
                ScoreDto.builder().subjectId("8").subjectName("Địa").oralScore(8.5).test15Score(8.0).test45Score(8.5).midtermScore(null).finalScore(null).averageScore(8.3).build(),
                ScoreDto.builder().subjectId("9").subjectName("GDCD").oralScore(9.0).test15Score(9.0).test45Score(null).midtermScore(null).finalScore(null).averageScore(9.0).build()
        );
    }

    private AttendanceSummaryDto generateSampleAttendance() {
        LocalDate today = LocalDate.now();
        return AttendanceSummaryDto.builder()
                .totalDays(20)
                .presentDays(17)
                .absentDays(2)
                .lateDays(1)
                .attendanceRate(85.0)
                .records(List.of(
                        AttendanceRecordDto.builder().date(today.minusDays(1).toString()).status("PRESENT").note(null).build(),
                        AttendanceRecordDto.builder().date(today.minusDays(2).toString()).status("LATE").note("Đến trễ 10 phút").build(),
                        AttendanceRecordDto.builder().date(today.minusDays(3).toString()).status("PRESENT").note(null).build(),
                        AttendanceRecordDto.builder().date(today.minusDays(4).toString()).status("PRESENT").note(null).build(),
                        AttendanceRecordDto.builder().date(today.minusDays(7).toString()).status("PRESENT").note(null).build(),
                        AttendanceRecordDto.builder().date(today.minusDays(8).toString()).status("ABSENT").note("Nghỉ ốm có phép").build(),
                        AttendanceRecordDto.builder().date(today.minusDays(9).toString()).status("PRESENT").note(null).build(),
                        AttendanceRecordDto.builder().date(today.minusDays(10).toString()).status("PRESENT").note(null).build(),
                        AttendanceRecordDto.builder().date(today.minusDays(11).toString()).status("PRESENT").note(null).build(),
                        AttendanceRecordDto.builder().date(today.minusDays(14).toString()).status("ABSENT").note("Nghỉ không phép").build()
                ))
                .build();
    }
}
