package com.schoolmanagement.backend.service.student;

import com.schoolmanagement.backend.dto.student.StudentProfileDto;
import com.schoolmanagement.backend.dto.exam.ExamScheduleDto;

import com.schoolmanagement.backend.domain.entity.classes.ClassRoom;
import com.schoolmanagement.backend.domain.entity.classes.Subject;
import com.schoolmanagement.backend.domain.entity.auth.User;
import com.schoolmanagement.backend.domain.auth.Role;
import com.schoolmanagement.backend.domain.exam.ExamStatus;
import com.schoolmanagement.backend.domain.entity.grade.Grade;
import com.schoolmanagement.backend.domain.entity.admin.Semester;
import com.schoolmanagement.backend.domain.entity.admin.AcademicYear;

import com.schoolmanagement.backend.repo.grade.GradeRepository;

import com.schoolmanagement.backend.domain.entity.timetable.TimetableDetail;
import com.schoolmanagement.backend.domain.entity.exam.ExamSchedule;
import com.schoolmanagement.backend.domain.entity.attendance.Attendance;
import com.schoolmanagement.backend.dto.attendance.AttendanceRecordDto;

import com.schoolmanagement.backend.repo.auth.UserRepository;
import com.schoolmanagement.backend.repo.student.StudentRepository;
import com.schoolmanagement.backend.repo.classes.ClassEnrollmentRepository;
import com.schoolmanagement.backend.repo.timetable.TimetableRepository;
import com.schoolmanagement.backend.repo.timetable.TimetableDetailRepository;
import com.schoolmanagement.backend.repo.attendance.AttendanceRepository;
import com.schoolmanagement.backend.repo.admin.SemesterRepository;
import com.schoolmanagement.backend.repo.exam.ExamScheduleRepository;
import com.schoolmanagement.backend.dto.timetable.StudentTimetableDto;
import com.schoolmanagement.backend.domain.entity.timetable.Timetable;
import com.schoolmanagement.backend.dto.timetable.TimetableSlotDto;
import com.schoolmanagement.backend.dto.grade.ScoreDto;
import com.schoolmanagement.backend.dto.attendance.AttendanceSummaryDto;
import com.schoolmanagement.backend.dto.student.StudentDashboardDto;
import com.schoolmanagement.backend.dto.student.StudentAnalysisDto;
import com.schoolmanagement.backend.domain.entity.student.Student;
import com.schoolmanagement.backend.domain.entity.classes.ClassEnrollment;

import com.schoolmanagement.backend.exception.ApiException;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.schoolmanagement.backend.service.admin.SemesterService;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Service for student portal functionality.
 * All data is fetched from the database. No mock/hardcoded data.
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class StudentPortalService {

        private final UserRepository userRepository;
        private final StudentRepository studentRepository;
        private final ClassEnrollmentRepository classEnrollmentRepository;
        private final TimetableRepository timetableRepository;
        private final TimetableDetailRepository timetableDetailRepository;
        private final GradeRepository gradeRepository;
        private final AttendanceRepository attendanceRepository;
        private final SemesterRepository semesterRepository;
        private final ExamScheduleRepository examScheduleRepository;
        private final SemesterService semesterService;

        // ==================== Public API Methods ====================

        /**
         * Get the student profile for the logged-in user.
         */
        @Transactional(readOnly = true)
        public StudentProfileDto getProfile(UUID userId) {
                Student student = getStudentForUser(userId);
                AcademicYear currentAcademicYear = semesterService
                                .getActiveAcademicYear(student.getSchool());

                // Get current class enrollment (nullable)
                ClassEnrollment enrollment = getCurrentEnrollment(student, currentAcademicYear);

                return StudentProfileDto.builder()
                                .id(student.getId())
                                .studentCode(student.getStudentCode())
                                .fullName(student.getFullName())
                                .email(student.getEmail())
                                .phone(student.getPhone())
                                .avatarUrl(student.getAvatarUrl())
                                .currentClassId(enrollment != null ? enrollment.getClassRoom().getId() : null)
                                .currentClassName(enrollment != null ? enrollment.getClassRoom().getName() : null)
                                .build();
        }

        /**
         * Get the timetable for the student's current class.
         * Returns empty slots if no enrollment or no official timetable found.
         */
        @Transactional(readOnly = true)
        public StudentTimetableDto getTimetable(UUID userId, String semesterId, LocalDate targetDate) {
                Student student = getStudentForUser(userId);

                Semester targetSemesterEntity = semesterId != null
                                ? semesterService.getSemester(UUID.fromString(semesterId))
                                : semesterService.getActiveSemesterEntity(student.getSchool());

                AcademicYear currentAcademicYearEntity = targetSemesterEntity
                                .getAcademicYear();
                String currentAcademicYear = currentAcademicYearEntity != null ? currentAcademicYearEntity.getName()
                                : null;
                int currentSemester = targetSemesterEntity.getSemesterNumber();

                log.info("=== getTimetable === StudentId={}, Year={}, Semester={}", student.getId(),
                                currentAcademicYear, currentSemester);

                ClassEnrollment enrollment = getCurrentEnrollment(student, currentAcademicYearEntity);

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

                // Find the timetable applicable for the targetDate
                LocalDate dateToUse = (targetDate != null) ? targetDate : LocalDate.now(java.time.ZoneId.of("Asia/Ho_Chi_Minh"));
                Timetable officialTimetable = timetableRepository
                                .findTimetableAtDate(student.getSchool(), dateToUse)
                                .orElse(null);
                int usedSemester = currentSemester;
                if (officialTimetable != null && officialTimetable.getSemester() != null) {
                        usedSemester = officialTimetable.getSemester().getSemesterNumber();
                        currentAcademicYear = officialTimetable.getSemester().getAcademicYear().getName();
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
                                        // Always sort Mon -> Sun (not alphabetic)
                                        .sorted(Comparator
                                                        .comparingInt((TimetableSlotDto s) -> DayOfWeek
                                                                        .valueOf(s.getDayOfWeek()).getValue())
                                                        .thenComparingInt(TimetableSlotDto::getSlotIndex))
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
         * Get today's schedule for the student.
         */
        @Transactional(readOnly = true)
        public List<TimetableSlotDto> getTodaySchedule(UUID userId, String semesterId) {
                Student student = getStudentForUser(userId);
                LocalDate today = LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"));

                // Fetch the timetable that was/is official for TODAY
                Timetable officialTimetable = timetableRepository
                                .findTimetableAtDate(student.getSchool(), today)
                                .orElse(null);

                if (officialTimetable == null) {
                        return new ArrayList<>();
                }

                ClassEnrollment enrollment = getCurrentEnrollment(student,
                                semesterService.getActiveSemesterEntity(student.getSchool()).getAcademicYear());
                if (enrollment == null) {
                        return new ArrayList<>();
                }

                List<TimetableDetail> details = timetableDetailRepository
                                .findAllByTimetableAndClassRoom(officialTimetable, enrollment.getClassRoom());

                String todayDayOfWeek = today.getDayOfWeek().name();

                return details.stream()
                                .filter(slot -> todayDayOfWeek.equalsIgnoreCase(slot.getDayOfWeek().name()))
                                .map(this::toSlotDto)
                                .sorted(Comparator.comparingInt(TimetableSlotDto::getSlotIndex))
                                .collect(Collectors.toList());
        }

        @Transactional(readOnly = true)
        public List<ExamScheduleDto> getExamSchedule(UUID userId, String semesterId) {
                Student student = getStudentForUser(userId);
                Semester targetSemester = semesterId != null
                                ? semesterService.getSemester(UUID.fromString(semesterId))
                                : semesterService.getActiveSemesterEntity(student.getSchool());

                return getSchedulesForStudent(student, targetSemester);
        }

        /**
         * Get exam schedule for a specific student by studentId (used by guardian).
         */
        @Transactional(readOnly = true)
        public List<ExamScheduleDto> getExamScheduleStudent(UUID studentId, UUID semesterId) {
                Student student = studentRepository.findById(studentId)
                                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Học sinh không tồn tại"));

                Semester targetSemester = semesterId != null
                                ? semesterService.getSemester(semesterId)
                                : semesterService.getActiveSemesterEntity(student.getSchool());

                return getSchedulesForStudent(student, targetSemester);
        }

        private List<ExamScheduleDto> getSchedulesForStudent(Student student,
                        Semester targetSemester) {
                ClassEnrollment enrollment = getCurrentEnrollment(student, targetSemester.getAcademicYear());
                if (enrollment == null) {
                        return new ArrayList<>();
                }

                ClassRoom classRoom = enrollment.getClassRoom();
                Integer grade = classRoom.getGrade();

                // Get student's subjects from combination
                final Set<UUID> studentSubjectIds = (classRoom.getCombination() != null
                                && classRoom.getCombination().getSubjects() != null)
                                                ? classRoom.getCombination().getSubjects().stream()
                                                                .map(Subject::getId)
                                                                .collect(Collectors.toSet())
                                                : new HashSet<>();

                // Find all schedules for this semester
                List<ExamSchedule> allSchedules = examScheduleRepository
                                .findByExamSession_Semester_Id(targetSemester.getId());

                LocalDate today = LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"));

                return allSchedules.stream()
                                // Filter by grade and subject combination
                                .filter(s -> s.getGrade().equals(grade) || (s.getClassRoom() != null
                                                && s.getClassRoom().getId().equals(classRoom.getId())))
                                .filter(s -> studentSubjectIds.contains(s.getSubject().getId()))
                                .map(s -> toExamScheduleDto(s, s.getRoomNumber(), today))
                                .sorted(Comparator.comparing(ExamScheduleDto::getExamDate)
                                                .thenComparing(ExamScheduleDto::getStartTime))
                                .collect(Collectors.toList());
        }

        /**
         * Get exam schedule with default parameters (overload).
         */
        @Transactional(readOnly = true)
        public List<ExamScheduleDto> getExamSchedule(UUID userId) {
                return getExamSchedule(userId, (String) null);
        }

        /**
         * Get scores for any student by studentId (used by guardians).
         */
        @Transactional(readOnly = true)
        public List<ScoreDto> getScores(UUID studentId, String semesterId) {
                Student student = studentRepository.findById(studentId)
                                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Học sinh không tồn tại"));
                return getScoresInternal(student, semesterId);
        }

        /**
         * Get scores for the student.
         * Returns ALL subjects from the student's class curriculum,
         * with null scores for subjects not yet graded.
         */
        @Transactional(readOnly = true)
        public List<ScoreDto> getScoresForUser(UUID userId, String semesterId) {
                Student student = getStudentForUser(userId);
                return getScoresInternal(student, semesterId);
        }

        private List<ScoreDto> getScoresInternal(Student student, String semesterId) {

                Semester targetSemesterEntity = semesterId != null
                                ? semesterService.getSemester(UUID.fromString(semesterId))
                                : semesterService.getActiveSemesterEntity(student.getSchool());

                AcademicYear currentAcademicYearEntity = targetSemesterEntity
                                .getAcademicYear();
                ClassEnrollment enrollment = getCurrentEnrollment(student, currentAcademicYearEntity);
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
                List<Grade> grades = gradeRepository
                                .findAllByStudentAndSemester(student, targetSemesterEntity);

                // Group scores by subject
                Map<UUID, Grade> gradeBySubject = grades.stream()
                                .collect(Collectors.toMap(g -> g.getSubject().getId(), g -> g));

                // Build result: all subjects from curriculum + any extra scored subjects
                List<ScoreDto> result = new ArrayList<>();

                // 1. Add all curriculum subjects (with or without scores)
                for (Subject subject : allSubjects) {
                        Grade grade = gradeBySubject
                                        .remove(subject.getId());
                        if (grade != null) {
                                ScoreDto dto = calculateSubjectScoresFromGrade(subject.getId(), grade);
                                if (dto != null)
                                        result.add(dto);
                        } else {
                                // No scores yet for this subject - show with all nulls
                                result.add(ScoreDto.builder()
                                                .subjectId(subject.getId().toString())
                                                .subjectName(subject.getName())
                                                .regularScores(new ArrayList<>())
                                                .midtermScore(null)
                                                .finalScore(null)
                                                .averageScore(null)
                                                .build());
                        }
                }

                // 2. Add any extra subjects with scores not in the combination
                for (Map.Entry<UUID, Grade> entry : gradeBySubject
                                .entrySet()) {
                        ScoreDto dto = calculateSubjectScoresFromGrade(entry.getKey(), entry.getValue());
                        if (dto != null)
                                result.add(dto);
                }

                result.sort(Comparator.comparing(ScoreDto::getSubjectName));
                return result;
        }

        /**
         * Get attendance summary for any student by studentId (used by guardians).
         */
        @Transactional(readOnly = true)
        public AttendanceSummaryDto getAttendance(UUID studentId, Integer month, Integer year, LocalDate targetDate) {
                Student student = studentRepository.findById(studentId)
                                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Học sinh không tồn tại"));

                return getAttendanceInternal(student, month, year, targetDate);
        }

        /**
         * Get attendance summary for the logged-in student.
         */
        @Transactional(readOnly = true)
        public AttendanceSummaryDto getAttendanceForUser(UUID userId, Integer month, Integer year, LocalDate targetDate) {
                Student student = getStudentForUser(userId);
                return getAttendanceInternal(student, month, year, targetDate);
        }

        private AttendanceSummaryDto getAttendanceInternal(Student student, Integer month, Integer year, LocalDate targetDate) {
                LocalDate today = LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"));

                // 1. Get active academic year
                Semester activeSemester = semesterService
                                .getActiveSemesterEntity(student.getSchool());
                if (activeSemester == null) {
                        return createEmptyAttendanceSummary();
                }
                AcademicYear academicYear = activeSemester
                                .getAcademicYear();

                // 2. Get student's class enrollment
                ClassEnrollment enrollment = getCurrentEnrollment(student, academicYear);
                if (enrollment == null)
                        return createEmptyAttendanceSummary();
                ClassRoom classRoom = enrollment.getClassRoom();

                // 3. Get ALL semesters in this academic year, ordered by semesterNumber
                List<com.schoolmanagement.backend.domain.entity.admin.Semester> semesters = semesterRepository
                                .findByAcademicYearOrderBySemesterNumber(academicYear);

                // 4. Get ALL historical official/archived timetables for this school
                List<Timetable> schoolHistory = timetableRepository.findTimetableAtDateInternal(student.getSchool(),
                                today);
                Map<UUID, Map<DayOfWeek, Long>> timetableSlotsCache = new HashMap<>();

                LocalDate earliestStart = null;
                long totalExpectedSessions = 0L;

                for (com.schoolmanagement.backend.domain.entity.admin.Semester sem : semesters) {
                        // Skip semesters that haven't started yet
                        if (sem.getStartDate().isAfter(today)) {
                                continue;
                        }

                        // Track earliest start date for attendance query range
                        if (earliestStart == null || sem.getStartDate().isBefore(earliestStart)) {
                                earliestStart = sem.getStartDate();
                        }

                        // Count from semester start to min(semester end, today)
                        LocalDate calculationEnd = today.isBefore(sem.getEndDate()) ? today : sem.getEndDate();
                        LocalDate current = sem.getStartDate();
                        while (!current.isAfter(calculationEnd)) {
                                LocalDate finalCurrent = current;
                                Timetable activeAtDate = schoolHistory.stream()
                                                .filter(t -> t.getAppliedDate() == null
                                                                || !t.getAppliedDate().isAfter(finalCurrent))
                                                .findFirst()
                                                .orElse(null);

                                if (activeAtDate != null) {
                                        Map<DayOfWeek, Long> slotsPerDay = timetableSlotsCache
                                                        .computeIfAbsent(activeAtDate.getId(), id -> {
                                                                List<TimetableDetail> details = timetableDetailRepository
                                                                                .findAllByTimetableAndClassRoom(
                                                                                                activeAtDate,
                                                                                                classRoom);
                                                                return details.stream()
                                                                                .collect(Collectors.groupingBy(
                                                                                                TimetableDetail::getDayOfWeek,
                                                                                                Collectors.counting()));
                                                        });
                                        totalExpectedSessions += slotsPerDay.getOrDefault(current.getDayOfWeek(), 0L);
                                }
                                current = current.plusDays(1);
                        }
                }

                // For the UI grid display, find the timetable active at the start of the
                // requested period
                LocalDate calculatedTargetDate = targetDate != null ? targetDate : ((month != null && year != null) ? LocalDate.of(year, month, 1) : today);
                Timetable latestApplicableTimetable = schoolHistory.stream()
                                .filter(t -> t.getAppliedDate() == null || !t.getAppliedDate().isAfter(calculatedTargetDate))
                                .findFirst()
                                .orElse(null);

                if (earliestStart == null) {
                        return createEmptyAttendanceSummary();
                }

                // 5. Get actual attendance records from earliest semester start to today
                List<Attendance> allAttendances = attendanceRepository
                                .findByStudentAndDateRange(student, earliestStart, today);

                long presentCount = allAttendances.stream()
                                .filter(a -> a.getStatus().name().equals("PRESENT")).count();
                long lateCount = allAttendances.stream()
                                .filter(a -> a.getStatus().name().equals("LATE")).count();
                long absentCount = allAttendances.stream()
                                .filter(a -> a.getStatus().name().equals("ABSENT_EXCUSED")
                                                || a.getStatus().name().equals("ABSENT_UNEXCUSED"))
                                .count();

                // 6. Calculate rate: (present + late) / totalExpected
                double overallRate = totalExpectedSessions > 0
                                ? Math.round((presentCount + lateCount) * 100.0 / totalExpectedSessions * 10.0) / 10.0
                                : 0.0;

                // 7. Filter records for UI display (by month/year if requested)
                List<Attendance> displayAttendances;
                if (month != null && year != null) {
                        displayAttendances = attendanceRepository.findByStudentAndMonthAndYear(student, month, year);
                } else {
                        displayAttendances = allAttendances;
                }

                List<AttendanceRecordDto> records = displayAttendances.stream()
                                .map(this::toAttendanceRecordDto)
                                .sorted(Comparator.comparing(AttendanceRecordDto::getDate).reversed()
                                                .thenComparing(AttendanceRecordDto::getSlotIndex))
                                .collect(Collectors.toList());

                // 8. Pre-calculate grid for frontend optimization
                Map<String, Map<Integer, AttendanceRecordDto>> attendanceGrid = new HashMap<>();
                for (AttendanceRecordDto record : records) {
                        String dateStr = record.getDate().toString();
                        attendanceGrid.computeIfAbsent(dateStr, k -> new HashMap<>())
                                        .put(record.getSlotIndex(), record);
                }

                // 9. Get the TKB structure for the UI grid (use the latest applicable TKB)
                List<TimetableSlotDto> timetableSlots = new ArrayList<>();
                if (latestApplicableTimetable != null) {
                        timetableSlots = timetableDetailRepository
                                        .findAllByTimetableAndClassRoom(latestApplicableTimetable, classRoom)
                                        .stream()
                                        .map(this::toTimetableSlotDto)
                                        .collect(Collectors.toList());
                }

                log.info("Attendance for student {}: totalExpected={}, present={}, late={}, absent={}, rate={}%",
                                student.getFullName(), totalExpectedSessions, presentCount, lateCount, absentCount,
                                overallRate);

                return AttendanceSummaryDto.builder()
                                .totalDays((int) totalExpectedSessions)
                                .presentDays((int) (presentCount + lateCount))
                                .absentDays((int) absentCount)
                                .lateDays((int) lateCount)
                                .attendanceRate(overallRate)
                                .records(records)
                                .attendanceGrid(attendanceGrid)
                                .classroomTimetable(timetableSlots)
                                .build();
        }

        private AttendanceSummaryDto createEmptyAttendanceSummary() {
                return AttendanceSummaryDto.builder()
                                .totalDays(0)
                                .presentDays(0)
                                .absentDays(0)
                                .lateDays(0)
                                .attendanceRate(0.0)
                                .records(new ArrayList<>())
                                .attendanceGrid(new HashMap<>())
                                .classroomTimetable(new ArrayList<>())
                                .build();
        }

        /**
         * Get dashboard data for the student overview page.
         */
        @Transactional(readOnly = true)
        public StudentDashboardDto getDashboard(UUID userId, String semesterId) {
                Student dashboardStudent = getStudentForUser(userId);
                StudentProfileDto profile = getProfile(userId);
                List<TimetableSlotDto> todaySchedule = getTodaySchedule(userId, semesterId);
                List<ExamScheduleDto> upcomingExams = getExamSchedule(userId, semesterId).stream()
                                .filter(e -> "UPCOMING".equals(e.getStatus()))
                                .limit(3)
                                .collect(Collectors.toList());
                List<ScoreDto> scores = getScoresForUser(userId, semesterId);

                // Calculate average score safely (avoid NaN)
                Double avgScore = scores.stream()
                                .filter(s -> s.getAverageScore() != null)
                                .mapToDouble(ScoreDto::getAverageScore)
                                .average()
                                .orElse(0.0);

                AttendanceSummaryDto attendance = getAttendanceForUser(userId, null, null, null);

                Semester targetSemester = semesterId != null
                                ? semesterService.getSemester(UUID.fromString(semesterId))
                                : semesterService.getActiveSemesterEntity(dashboardStudent.getSchool());

                String semesterLabel = "Học kỳ " + targetSemester.getSemesterNumber()
                                + " - "
                                + (targetSemester.getAcademicYear() != null ? targetSemester.getAcademicYear().getName()
                                                : "");

                return StudentDashboardDto.builder()
                                .profile(profile)
                                .averageScore(Math.round(avgScore * 10.0) / 10.0)
                                .totalSubjects(scores.size())
                                .attendanceRate(attendance.getAttendanceRate())
                                .absences(attendance.getAbsentDays())
                                .semester(semesterLabel)
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
                String currentAcademicYear = semesterService.getActiveAcademicYearName(student.getSchool());
                int currentSemester = semesterService.getActiveSemesterNumber(student.getSchool());

                StudentProfileDto profile = getProfile(userId);
                List<ScoreDto> scores = getScoresForUser(userId, null); // Default to active semester

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

                AttendanceSummaryDto attendance = getAttendanceForUser(userId, null, null, null);

                return StudentAnalysisDto.builder()
                                .studentId(student.getId().toString())
                                .studentName(student.getFullName())
                                .className(profile.currentClassName())
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
        private ClassEnrollment getCurrentEnrollment(Student student,
                        AcademicYear academicYear) {
                if (academicYear == null)
                        return null;
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
                return TimetableSlotDto.builder()
                                .id(detail.getId().toString())
                                .dayOfWeek(detail.getDayOfWeek().name())
                                .slotIndex(detail.getSlotIndex())
                                .subjectName(detail.getSubject().getName())
                                .teacherName(detail.getTeacher() != null ? detail.getTeacher().getFullName()
                                                : "Chưa phân công")
                                .roomName(detail.getClassRoom().getRoom() != null
                                                ? detail.getClassRoom().getRoom().getName()
                                                : "Chưa xếp")
                                .build();
        }

        // getCurrentAcademicYear() and getCurrentSemester() removed — now using
        // SemesterService

        private String getTodayDayOfWeekName() {
                DayOfWeek dow = LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh")).getDayOfWeek();
                return dow.name();
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

        private ScoreDto calculateSubjectScoresFromGrade(UUID subjectId,
                        Grade grade) {
                if (grade == null)
                        return null;

                String subjectName = grade.getSubject().getName();
                List<Double> regularScores = new ArrayList<>();

                if (grade.getRegularScores() != null) {
                        regularScores = grade.getRegularScores().stream()
                                        .map(rs -> rs.getScoreValue() != null ? rs.getScoreValue().doubleValue() : null)
                                        .filter(val -> val != null)
                                        .collect(Collectors.toList());
                }

                Double midtermScore = grade.getMidtermScore() != null ? grade.getMidtermScore().doubleValue() : null;
                Double finalScore = grade.getFinalScore() != null ? grade.getFinalScore().doubleValue() : null;
                Double averageScore = grade.getAverageScore() != null ? grade.getAverageScore().doubleValue() : null;

                return ScoreDto.builder()
                                .subjectId(subjectId.toString())
                                .subjectName(subjectName)
                                .regularScores(regularScores)
                                .midtermScore(midtermScore)
                                .finalScore(finalScore)
                                .averageScore(averageScore)
                                .build();
        }

        private AttendanceRecordDto toAttendanceRecordDto(Attendance attendance) {
                return AttendanceRecordDto.builder()
                                .date(attendance.getAttendanceDate())
                                .slotIndex(attendance.getSlotIndex())
                                .subjectName(attendance.getSubject() != null ? attendance.getSubject().getName() : "")
                                .status(attendance.getStatus().name())
                                .note(attendance.getRemarks())
                                .build();
        }

        private TimetableSlotDto toTimetableSlotDto(TimetableDetail detail) {
                return TimetableSlotDto.builder()
                                .dayOfWeek(detail.getDayOfWeek().name())
                                .slotIndex(detail.getSlotIndex())
                                .subjectName(detail.getSubject() != null ? detail.getSubject().getName() : "")
                                .roomName(detail.getClassRoom() != null ? detail.getClassRoom().getName() : "")
                                .teacherName(detail.getTeacher() != null ? detail.getTeacher().getFullName() : "")
                                .build();
        }
}
