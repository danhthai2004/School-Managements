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
 * All data is fetched from the database. No mock/hardcoded data.
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
        private final ExamStudentRepository examStudentRepository;

        // ==================== Public API Methods ====================

        /**
         * Get the student profile for the logged-in user.
         */
        @Transactional(readOnly = true)
        public StudentProfileDto getProfile(UUID userId) {
                Student student = getStudentForUser(userId);
                String currentAcademicYear = getCurrentAcademicYear();

                // Get current class enrollment (nullable)
                ClassEnrollment enrollment = getCurrentEnrollment(student, currentAcademicYear);

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
         * Returns empty slots if no enrollment or no official timetable found.
         */
        @Transactional(readOnly = true)
        public StudentTimetableDto getTimetable(UUID userId) {
                Student student = getStudentForUser(userId);
                String currentAcademicYear = getCurrentAcademicYear();
                int currentSemester = getCurrentSemester();

                log.info("=== getTimetable === StudentId={}, Year={}, Semester={}", student.getId(),
                                currentAcademicYear, currentSemester);

                ClassEnrollment enrollment = getCurrentEnrollment(student, currentAcademicYear);

                // No enrollment => return empty timetable
                if (enrollment == null) {
                        log.warn("No enrollment found for student {} in year {}", student.getId(), currentAcademicYear);
                        return StudentTimetableDto.builder()
                                        .classId(null)
                                        .className(null)
                                        .academicYear(currentAcademicYear)
                                        .semester(currentSemester)
                                        .slots(new ArrayList<>())
                                        .build();
                }

                ClassRoom classRoom = enrollment.getClassRoom();
                log.info("Enrollment found: class={}", classRoom.getName());

                // Find official timetable - try current semester first, then fallback
                Timetable officialTimetable = findOfficialTimetable(student.getSchool(), currentAcademicYear,
                                currentSemester);
                int usedSemester = currentSemester;

                // Fallback: if no timetable for current semester, try the other one
                if (officialTimetable == null) {
                        int otherSemester = (currentSemester == 1) ? 2 : 1;
                        log.info("No timetable for semester {}, trying semester {}", currentSemester, otherSemester);
                        officialTimetable = findOfficialTimetable(student.getSchool(), currentAcademicYear,
                                        otherSemester);
                        if (officialTimetable != null) {
                                usedSemester = otherSemester;
                        }
                }

                List<TimetableSlotDto> slots = new ArrayList<>();
                if (officialTimetable != null) {
                        log.info("Official timetable found: id={}, name={}, semester={}", officialTimetable.getId(),
                                        officialTimetable.getName(), usedSemester);
                        List<TimetableDetail> details = timetableDetailRepository
                                        .findAllByTimetableAndClassRoom(officialTimetable, classRoom);
                        log.info("TimetableDetails for class {}: {} entries", classRoom.getName(), details.size());

                        slots = details.stream()
                                        .map(this::toSlotDto)
                                        .sorted(Comparator.comparingInt(TimetableSlotDto::getDayOfWeek)
                                                        .thenComparingInt(TimetableSlotDto::getPeriod))
                                        .collect(Collectors.toList());
                } else {
                        log.warn("No OFFICIAL timetable found for year={} in any semester", currentAcademicYear);
                }

                log.info("Returning {} slots", slots.size());
                return StudentTimetableDto.builder()
                                .classId(classRoom.getId().toString())
                                .className(classRoom.getName())
                                .academicYear(currentAcademicYear)
                                .semester(usedSemester)
                                .slots(slots)
                                .build();
        }

        /**
         * Find the first OFFICIAL timetable for the given school, year, and semester.
         */
        private Timetable findOfficialTimetable(School school, String academicYear, int semester) {
                return timetableRepository
                                .findAllBySchoolAndAcademicYearAndSemester(school, academicYear, semester)
                                .stream()
                                .filter(t -> t.getStatus() == TimetableStatus.OFFICIAL)
                                .findFirst()
                                .orElse(null);
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
         * Get exam schedule for the student (called by student).
         */
        @Transactional(readOnly = true)
        public List<ExamScheduleDto> getExamSchedule(UUID userId, String academicYear, Integer semester) {
                Student student = getStudentForUser(userId);
                String targetAcademicYear = (academicYear != null && !academicYear.isEmpty())
                                ? academicYear
                                : getCurrentAcademicYear();

                List<ExamStudent> examStudents;
                if (semester != null) {
                        examStudents = examStudentRepository.findByStudentAndAcademicYearAndSemester(
                                        student.getId(), targetAcademicYear, semester);
                } else {
                        examStudents = examStudentRepository.findByStudentAndAcademicYear(
                                        student.getId(), targetAcademicYear);
                }

                LocalDate today = LocalDate.now();
                return examStudents.stream()
                                .map(es -> toExamScheduleDto(es.getExamRoom().getExamSchedule(),
                                                es.getExamRoom().getRoom().getName(), today))
                                .collect(Collectors.toList());
        }

        /**
         * Get exam schedule for a specific student by studentId (used by guardian).
         */
        @Transactional(readOnly = true)
        public List<ExamScheduleDto> getExamScheduleStudent(UUID studentId, String academicYear, Integer semester) {
                Student student = studentRepository.findById(studentId)
                                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Học sinh không tồn tại"));
                String targetAcademicYear = (academicYear != null && !academicYear.isEmpty())
                                ? academicYear
                                : getCurrentAcademicYear();

                List<ExamStudent> examStudents;
                if (semester != null) {
                        examStudents = examStudentRepository.findByStudentAndAcademicYearAndSemester(
                                        student.getId(), targetAcademicYear, semester);
                } else {
                        examStudents = examStudentRepository.findByStudentAndAcademicYear(
                                        student.getId(), targetAcademicYear);
                }

                LocalDate today = LocalDate.now();
                return examStudents.stream()
                                .map(es -> toExamScheduleDto(es.getExamRoom().getExamSchedule(),
                                                es.getExamRoom().getRoom().getName(), today))
                                .collect(Collectors.toList());
        }

        /**
         * Get exam schedule with default parameters (overload).
         */
        @Transactional(readOnly = true)
        public List<ExamScheduleDto> getExamSchedule(UUID userId) {
                return getExamSchedule(userId, null, null);
        }

        /**
         * Get scores for the student.
         * Returns ALL subjects from the student's class curriculum,
         * with null scores for subjects not yet graded.
         */
        @Transactional(readOnly = true)
        public List<ScoreDto> getScores(UUID userId, Integer semester) {
                Student student = getStudentForUser(userId);
                String currentAcademicYear = getCurrentAcademicYear();
                int targetSemester = semester != null ? semester : getCurrentSemester();

                ClassEnrollment enrollment = getCurrentEnrollment(student, currentAcademicYear);
                if (enrollment == null) {
                        return new ArrayList<>();
                }

                // Get all subjects from the class's combination (curriculum)
                ClassRoom classRoom = enrollment.getClassRoom();
                Set<Subject> allSubjects = new LinkedHashSet<>();
                if (classRoom.getCombination() != null && classRoom.getCombination().getSubjects() != null) {
                        allSubjects.addAll(classRoom.getCombination().getSubjects());
                }

                // Get actual scores from DB
                List<Score> scores = scoreRepository
                                .findByStudentAndAcademicYearAndSemester(student, currentAcademicYear, targetSemester);

                // Group scores by subject
                Map<UUID, List<Score>> scoresBySubject = scores.stream()
                                .collect(Collectors.groupingBy(s -> s.getSubject().getId()));

                // Build result: all subjects from curriculum + any extra scored subjects
                List<ScoreDto> result = new ArrayList<>();

                // 1. Add all curriculum subjects (with or without scores)
                for (Subject subject : allSubjects) {
                        List<Score> subjectScores = scoresBySubject.remove(subject.getId());
                        if (subjectScores != null && !subjectScores.isEmpty()) {
                                ScoreDto dto = calculateSubjectScores(subject.getId(), subjectScores);
                                if (dto != null)
                                        result.add(dto);
                        } else {
                                // No scores yet for this subject - show with all nulls
                                result.add(ScoreDto.builder()
                                                .subjectId(subject.getId().toString())
                                                .subjectName(subject.getName())
                                                .oralScore(null)
                                                .test15Score(null)
                                                .test45Score(null)
                                                .midtermScore(null)
                                                .finalScore(null)
                                                .averageScore(null)
                                                .build());
                        }
                }

                // 2. Add any extra subjects with scores not in the combination
                for (Map.Entry<UUID, List<Score>> entry : scoresBySubject.entrySet()) {
                        ScoreDto dto = calculateSubjectScores(entry.getKey(), entry.getValue());
                        if (dto != null)
                                result.add(dto);
                }

                result.sort(Comparator.comparing(ScoreDto::getSubjectName));
                return result;
        }

        /**
         * Get attendance summary for the student.
         */
        @Transactional(readOnly = true)
        public AttendanceSummaryDto getAttendance(UUID userId, Integer month, Integer year) {
                Student student = getStudentForUser(userId);

                LocalDate now = LocalDate.now();
                int targetMonth = month != null ? month : now.getMonthValue();
                int targetYear = year != null ? year : now.getYear();

                List<Attendance> attendances = attendanceRepository
                                .findByStudentAndMonthAndYear(student, targetMonth, targetYear);

                if (attendances.isEmpty()) {
                        return AttendanceSummaryDto.builder()
                                        .totalDays(0)
                                        .presentDays(0)
                                        .absentDays(0)
                                        .lateDays(0)
                                        .attendanceRate(0.0)
                                        .records(new ArrayList<>())
                                        .build();
                }

                int totalDays = attendances.size();
                long presentDays = attendances.stream()
                                .filter(a -> a.getStatus() == AttendanceStatus.PRESENT).count();
                long absentDays = attendances.stream()
                                .filter(a -> a.getStatus() == AttendanceStatus.ABSENT_UNEXCUSED).count();
                long lateDays = attendances.stream()
                                .filter(a -> a.getStatus() == AttendanceStatus.LATE).count();

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

                // Calculate average score safely (avoid NaN)
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
         * Get detailed learning analysis for the student.
         */
        @Transactional(readOnly = true)
        public StudentAnalysisDto getAnalysis(UUID userId) {
                Student student = getStudentForUser(userId);
                String currentAcademicYear = getCurrentAcademicYear();
                int currentSemester = getCurrentSemester();

                StudentProfileDto profile = getProfile(userId);
                List<ScoreDto> scores = getScores(userId, currentSemester);

                // Score statistics
                Double overallAverage = 0.0;
                Double highestScore = 0.0;
                Double lowestScore = 10.0;
                String bestSubject = "";
                String worstSubject = "";

                int excellentCount = 0, goodCount = 0, averageCount = 0, belowAverageCount = 0;
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

                                        if (avg >= 8.5)
                                                excellentCount++;
                                        else if (avg >= 7.0)
                                                goodCount++;
                                        else if (avg >= 5.0)
                                                averageCount++;
                                        else
                                                belowAverageCount++;

                                        String performance;
                                        if (avg >= 8.5)
                                                performance = "EXCELLENT";
                                        else if (avg >= 7.0)
                                                performance = "GOOD";
                                        else if (avg >= 5.0)
                                                performance = "AVERAGE";
                                        else
                                                performance = "BELOW_AVERAGE";

                                        subjectScores.add(StudentAnalysisDto.SubjectScoreSummary.builder()
                                                        .subjectId(score.getSubjectId())
                                                        .subjectName(score.getSubjectName())
                                                        .averageScore(avg)
                                                        .performance(performance)
                                                        .trend(0.0)
                                                        .build());
                                }
                        }

                        if (validCount > 0) {
                                overallAverage = Math.round(totalScore / validCount * 10.0) / 10.0;
                        }
                }

                AttendanceSummaryDto attendance = getAttendance(userId, null, null);

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
                                .monthlyPerformance(new ArrayList<>())
                                .classRank(null)
                                .totalStudentsInClass(null)
                                .build();
        }

        // ==================== Core Helper: Get Current Enrollment ====================

        /**
         * Finds the student's most recent ClassEnrollment for the given academic year.
         * Returns null if not found (instead of throwing an exception).
         */
        private ClassEnrollment getCurrentEnrollment(Student student, String academicYear) {
                return classEnrollmentRepository
                                .findTopByStudentAndAcademicYearOrderByEnrolledAtDesc(student, academicYear)
                                .orElse(null);
        }

        // ==================== Helper Methods ====================

        private Student getStudentForUser(UUID userId) {
                User user = userRepository.findById(userId)
                                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User không tồn tại"));

                if (user.getRole() != Role.STUDENT) {
                        throw new ApiException(HttpStatus.FORBIDDEN, "Chỉ học sinh mới có quyền truy cập");
                }

                return studentRepository.findByUserIdWithDetails(userId)
                                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND,
                                                "Không tìm thấy hồ sơ học sinh"));
        }

        private TimetableSlotDto toSlotDto(TimetableDetail detail) {
                // Convert Java DayOfWeek (MONDAY=1) to Vietnamese convention (2=Mon...7=Sat)
                int dayOfWeek = detail.getDayOfWeek().getValue() + 1;

                return TimetableSlotDto.builder()
                                .id(detail.getId().toString())
                                .dayOfWeek(dayOfWeek)
                                .period(detail.getSlotIndex())
                                .subjectName(detail.getSubject().getName())
                                .teacherName(detail.getTeacher() != null ? detail.getTeacher().getFullName()
                                                : "Chưa phân công")
                                .room(detail.getClassRoom().getRoom() != null
                                                ? detail.getClassRoom().getRoom().getName()
                                                : "Chưa xếp")
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
                int month = LocalDate.now().getMonthValue();
                // Semester 1: Sep-Jan, Semester 2: Feb-Jun
                return (month >= 9 || month <= 1) ? 1 : 2;
        }

        private int getTodayDayOfWeek() {
                DayOfWeek dow = LocalDate.now().getDayOfWeek();
                return dow.getValue() + 1;
        }

        private ExamScheduleDto toExamScheduleDto(ExamSchedule exam, String roomName, LocalDate today) {
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
                                .room(roomName != null ? roomName : exam.getRoomNumber())
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

                // Calculate weighted average: Oral=1, Test15=1, Test45=2, Midterm=2, Final=3
                double totalWeight = 0;
                double weightedSum = 0;

                if (oralScore != null) {
                        weightedSum += oralScore * 1;
                        totalWeight += 1;
                }
                if (test15Score != null) {
                        weightedSum += test15Score * 1;
                        totalWeight += 1;
                }
                if (test45Score != null) {
                        weightedSum += test45Score * 2;
                        totalWeight += 2;
                }
                if (midtermScore != null) {
                        weightedSum += midtermScore * 2;
                        totalWeight += 2;
                }
                if (finalScore != null) {
                        weightedSum += finalScore * 3;
                        totalWeight += 3;
                }

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
}
