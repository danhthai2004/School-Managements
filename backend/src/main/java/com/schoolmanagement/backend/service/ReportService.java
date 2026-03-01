package com.schoolmanagement.backend.service;

import com.schoolmanagement.backend.domain.AttendanceStatus;
import com.schoolmanagement.backend.domain.Gender;
import com.schoolmanagement.backend.domain.StudentStatus;
import com.schoolmanagement.backend.domain.entity.*;
import com.schoolmanagement.backend.dto.report.*;
import com.schoolmanagement.backend.dto.report.ReportOverviewDto.*;
import com.schoolmanagement.backend.dto.report.StudentReportDto.StudentByClassDto;
import com.schoolmanagement.backend.dto.report.StudentReportDto.EnrollmentStatDto;
import com.schoolmanagement.backend.dto.report.StudentReportDto.GenderStats;
import com.schoolmanagement.backend.dto.report.TeacherReportDto.*;
import com.schoolmanagement.backend.dto.report.ClassReportDto.*;
import com.schoolmanagement.backend.repo.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ReportService {

        private final StudentRepository studentRepository;
        private final TeacherRepository teacherRepository;
        private final ClassRoomRepository classRoomRepository;
        private final ClassEnrollmentRepository enrollmentRepository;
        private final TeacherAssignmentRepository assignmentRepository;
        private final AttendanceRepository attendanceRepository;
        private final GradeRepository gradeRepository;
        private final TimetableRepository timetableRepository;

        // ==================== DASHBOARD OVERVIEW ====================

        public ReportOverviewDto getSchoolOverview(School school) {
                long totalStudents = studentRepository.countBySchool(school);
                long totalTeachers = teacherRepository.countBySchool(school);
                long totalClasses = classRoomRepository.countBySchool(school);
                String currentAcademicYear = getCurrentAcademicYear();

                // Gender distribution
                List<Student> allStudents = studentRepository.findAllBySchoolOrderByFullNameAsc(school);
                long male = allStudents.stream().filter(s -> s.getGender() == Gender.MALE).count();
                long female = allStudents.stream().filter(s -> s.getGender() == Gender.FEMALE).count();
                long other = allStudents.stream().filter(s -> s.getGender() == Gender.OTHER || s.getGender() == null)
                                .count();
                StudentGenderDistribution genderDist = new StudentGenderDistribution(male, female, other);

                // Grade distribution (10, 11, 12)
                List<ClassRoom> allClasses = classRoomRepository.findAllBySchoolOrderByGradeAscNameAsc(school);
                Map<Integer, Long> classCountByGrade = allClasses.stream()
                                .collect(Collectors.groupingBy(ClassRoom::getGrade, Collectors.counting()));

                List<GradeDistribution> gradeDistList = new ArrayList<>();
                for (int grade = 10; grade <= 12; grade++) {
                        long classCount = classCountByGrade.getOrDefault(grade, 0L);
                        int finalGrade = grade;
                        long studentCount = allClasses.stream()
                                        .filter(c -> c.getGrade() == finalGrade)
                                        .mapToLong(c -> enrollmentRepository.countByClassRoom(c))
                                        .sum();
                        gradeDistList.add(new GradeDistribution(grade, studentCount, classCount));
                }

                return new ReportOverviewDto(
                                totalStudents, totalTeachers, totalClasses,
                                currentAcademicYear, genderDist, gradeDistList);
        }

        // ==================== STUDENT REPORTS ====================

        public StudentReportDto getStudentReport(School school) {
                List<Student> allStudents = studentRepository.findAllBySchoolOrderByFullNameAsc(school);

                long totalStudents = allStudents.size();
                long activeStudents = allStudents.stream().filter(s -> s.getStatus() == StudentStatus.ACTIVE).count();
                long inactiveStudents = totalStudents - activeStudents;
                long studentsWithAccount = allStudents.stream().filter(s -> s.getUser() != null).count();
                long studentsWithoutAccount = totalStudents - studentsWithAccount;

                // Gender stats
                long male = allStudents.stream().filter(s -> s.getGender() == Gender.MALE).count();
                long female = allStudents.stream().filter(s -> s.getGender() == Gender.FEMALE).count();
                long other = allStudents.stream()
                                .filter(s -> s.getGender() != Gender.MALE && s.getGender() != Gender.FEMALE)
                                .count();
                GenderStats genderStats = new GenderStats(male, female, other);

                // Students by class
                List<ClassRoom> allClasses = classRoomRepository.findAllBySchoolOrderByGradeAscNameAsc(school);
                List<StudentByClassDto> studentsByClass = allClasses.stream()
                                .map(c -> new StudentByClassDto(
                                                c.getId(),
                                                c.getName(),
                                                c.getGrade(),
                                                enrollmentRepository.countByClassRoom(c),
                                                c.getMaxCapacity()))
                                .toList();

                // Enrollment stats (by month for current year)
                List<EnrollmentStatDto> enrollmentStats = getEnrollmentStatsByMonth(allStudents);

                return new StudentReportDto(
                                totalStudents, activeStudents, inactiveStudents,
                                studentsWithAccount, studentsWithoutAccount,
                                studentsByClass, enrollmentStats, genderStats);
        }

        public StudentDetailedListDto getStudentsByClass(School school, UUID classId) {
                ClassRoom classRoom = classRoomRepository.findById(classId)
                                .filter(c -> c.getSchool().getId().equals(school.getId()))
                                .orElseThrow(() -> new RuntimeException(
                                                "Lớp không tồn tại hoặc không thuộc trường này"));

                List<ClassEnrollment> enrollments = enrollmentRepository.findAllByClassRoom(classRoom);

                List<StudentDetailedListDto.StudentDetailDto> students = enrollments.stream()
                                .map(e -> {
                                        Student s = e.getStudent();
                                        return new StudentDetailedListDto.StudentDetailDto(
                                                        s.getId(),
                                                        s.getStudentCode(),
                                                        s.getFullName(),
                                                        s.getGender() != null ? s.getGender().name() : "N/A",
                                                        s.getDateOfBirth(),
                                                        s.getEmail(),
                                                        s.getPhone(),
                                                        s.getStatus() != null ? s.getStatus().name() : "N/A",
                                                        s.getUser() != null,
                                                        s.getEnrollmentDate());
                                })
                                .sorted(Comparator.comparing(StudentDetailedListDto.StudentDetailDto::fullName))
                                .toList();

                return new StudentDetailedListDto(
                                classRoom.getId(),
                                classRoom.getName(),
                                classRoom.getGrade(),
                                classRoom.getAcademicYear(),
                                classRoom.getMaxCapacity(),
                                students.size(),
                                students);
        }

        public StudentsWithoutAccountDto getStudentsWithoutAccount(School school) {
                List<Student> studentsNoAccount = studentRepository.findAllBySchoolOrderByFullNameAsc(school).stream()
                                .filter(s -> s.getUser() == null && s.getStatus() == StudentStatus.ACTIVE)
                                .toList();

                Map<String, List<Student>> byClass = new LinkedHashMap<>();
                List<ClassRoom> allClasses = classRoomRepository.findAllBySchoolOrderByGradeAscNameAsc(school);

                for (ClassRoom c : allClasses) {
                        List<ClassEnrollment> enrollments = enrollmentRepository.findAllByClassRoom(c);
                        List<Student> classStudentsNoAccount = enrollments.stream()
                                        .map(ClassEnrollment::getStudent)
                                        .filter(s -> s.getUser() == null && s.getStatus() == StudentStatus.ACTIVE)
                                        .toList();
                        if (!classStudentsNoAccount.isEmpty()) {
                                byClass.put(c.getName(), classStudentsNoAccount);
                        }
                }

                List<StudentsWithoutAccountDto.StudentNoAccountByClassDto> byClassList = byClass.entrySet().stream()
                                .map(e -> new StudentsWithoutAccountDto.StudentNoAccountByClassDto(
                                                e.getKey(),
                                                e.getValue().stream()
                                                                .map(s -> new StudentsWithoutAccountDto.StudentBasicDto(
                                                                                s.getId(),
                                                                                s.getStudentCode(), s.getFullName(),
                                                                                s.getEmail()))
                                                                .toList()))
                                .toList();

                return new StudentsWithoutAccountDto(
                                studentsNoAccount.size(),
                                byClassList);
        }

        public EnrollmentTrendDto getEnrollmentTrend(School school, String academicYear) {
                List<Student> allStudents = studentRepository.findAllBySchoolOrderByFullNameAsc(school);

                int startYear;
                try {
                        startYear = Integer.parseInt(academicYear.split("-")[0]);
                } catch (Exception e) {
                        startYear = LocalDate.now().getYear();
                }

                final int year = startYear;

                List<EnrollmentStatDto> monthlyStats = new ArrayList<>();
                for (int m = 9; m <= 12; m++) {
                        final int month = m;
                        long count = allStudents.stream()
                                        .filter(s -> s.getEnrollmentDate() != null
                                                        && s.getEnrollmentDate().getYear() == year
                                                        && s.getEnrollmentDate().getMonthValue() == month)
                                        .count();
                        monthlyStats.add(new EnrollmentStatDto(year, month, count));
                }
                for (int m = 1; m <= 8; m++) {
                        final int month = m;
                        long count = allStudents.stream()
                                        .filter(s -> s.getEnrollmentDate() != null
                                                        && s.getEnrollmentDate().getYear() == (year + 1)
                                                        && s.getEnrollmentDate().getMonthValue() == month)
                                        .count();
                        monthlyStats.add(new EnrollmentStatDto(year + 1, month, count));
                }

                Map<Integer, Long> byGrade = allStudents.stream()
                                .filter(s -> s.getEnrollmentDate() != null
                                                && ((s.getEnrollmentDate().getYear() == year
                                                                && s.getEnrollmentDate().getMonthValue() >= 9)
                                                                || (s.getEnrollmentDate().getYear() == year + 1
                                                                                && s.getEnrollmentDate()
                                                                                                .getMonthValue() <= 8)))
                                .collect(Collectors.groupingBy(s -> {
                                        List<ClassEnrollment> enrollments = enrollmentRepository.findAllByStudent(s);
                                        return enrollments.isEmpty() ? 10
                                                        : enrollments.get(0).getClassRoom().getGrade();
                                }, Collectors.counting()));

                List<EnrollmentTrendDto.EnrollmentByGradeDto> gradeStats = List.of(
                                new EnrollmentTrendDto.EnrollmentByGradeDto(10, byGrade.getOrDefault(10, 0L)),
                                new EnrollmentTrendDto.EnrollmentByGradeDto(11, byGrade.getOrDefault(11, 0L)),
                                new EnrollmentTrendDto.EnrollmentByGradeDto(12, byGrade.getOrDefault(12, 0L)));

                long totalNewEnrollments = monthlyStats.stream().mapToLong(EnrollmentStatDto::newEnrollments).sum();

                return new EnrollmentTrendDto(academicYear, totalNewEnrollments, monthlyStats, gradeStats);
        }

        // ==================== TEACHER REPORTS ====================

        public TeacherReportDto getTeacherReport(School school) {
                List<Teacher> allTeachers = teacherRepository.findAllBySchoolOrderByFullNameAsc(school);

                long totalTeachers = allTeachers.size();
                long activeTeachers = allTeachers.stream().filter(t -> "ACTIVE".equals(t.getStatus())).count();
                long inactiveTeachers = totalTeachers - activeTeachers;

                // Teachers by subject — use primarySubject (ManyToOne) instead of collection
                Map<Subject, Long> teachersBySubject = allTeachers.stream()
                                .filter(t -> t.getPrimarySubject() != null)
                                .collect(Collectors.groupingBy(Teacher::getPrimarySubject, Collectors.counting()));

                List<TeacherBySubjectDto> teachersBySubjectList = teachersBySubject.entrySet().stream()
                                .map(e -> new TeacherBySubjectDto(e.getKey().getId(), e.getKey().getName(),
                                                e.getValue()))
                                .toList();

                // Teacher workload
                List<TeacherAssignment> allAssignments = assignmentRepository.findAllBySchool(school);
                Map<UUID, List<TeacherAssignment>> assignmentsByTeacher = allAssignments.stream()
                                .filter(a -> a.getTeacher() != null)
                                .collect(Collectors.groupingBy(a -> a.getTeacher().getId()));

                List<TeacherWorkloadDto> workloadList = allTeachers.stream()
                                .map(t -> {
                                        List<TeacherAssignment> assignments = assignmentsByTeacher
                                                        .getOrDefault(t.getId(), List.of());
                                        int assignedClasses = assignments.size();
                                        int totalPeriods = assignments.stream()
                                                        .mapToInt(TeacherAssignment::getLessonsPerWeek)
                                                        .sum();

                                        String primarySubjectName = t.getPrimarySubject() != null
                                                        ? t.getPrimarySubject().getName()
                                                        : "N/A";

                                        return new TeacherWorkloadDto(
                                                        t.getId(), t.getTeacherCode(), t.getFullName(),
                                                        primarySubjectName, assignedClasses, totalPeriods);
                                })
                                .toList();

                return new TeacherReportDto(totalTeachers, activeTeachers, inactiveTeachers, teachersBySubjectList,
                                workloadList);
        }

        // ==================== CLASS REPORTS ====================

        public ClassReportDto getClassReport(School school) {
                List<ClassRoom> allClasses = classRoomRepository.findAllBySchoolOrderByGradeAscNameAsc(school);

                long totalClasses = allClasses.size();
                long activeClasses = allClasses.stream()
                                .filter(c -> c.getStatus() == com.schoolmanagement.backend.domain.ClassRoomStatus.ACTIVE)
                                .count();

                List<ClassSummaryDto> classSummaries = allClasses.stream()
                                .map(c -> new ClassSummaryDto(
                                                c.getId(),
                                                c.getName(),
                                                c.getGrade(),
                                                c.getAcademicYear(),
                                                c.getDepartment() != null ? c.getDepartment().name() : "N/A",
                                                enrollmentRepository.countByClassRoom(c),
                                                c.getMaxCapacity(),
                                                c.getHomeroomTeacher() != null ? c.getHomeroomTeacher().getFullName()
                                                                : "Chưa phân công",
                                                true // Placeholder for hasFullTeachers check
                                ))
                                .toList();

                Map<Integer, Long> classCountByGrade = allClasses.stream()
                                .collect(Collectors.groupingBy(ClassRoom::getGrade, Collectors.counting()));

                List<ClassByGradeDto> classesByGrade = classCountByGrade.entrySet().stream()
                                .map(e -> {
                                        long totalStudentsInGrade = allClasses.stream()
                                                        .filter(c -> c.getGrade() == e.getKey())
                                                        .mapToLong(c -> enrollmentRepository.countByClassRoom(c))
                                                        .sum();
                                        return new ClassByGradeDto(e.getKey(), e.getValue(), totalStudentsInGrade);
                                })
                                .sorted(Comparator.comparingInt(ClassByGradeDto::grade))
                                .toList();

                return new ClassReportDto(totalClasses, activeClasses, classSummaries, classesByGrade);
        }

        // ==================== ATTENDANCE REPORTS ====================

        /**
         * Attendance report — uses Attendance entity directly (no AttendanceSession).
         * Queries attendance by classRoom + date range.
         */
        public AttendanceReportDto getAttendanceReport(School school) {
                List<ClassRoom> allClasses = classRoomRepository.findAllBySchoolOrderByGradeAscNameAsc(school);

                // Get date range for current academic year
                LocalDate startDate = getAcademicYearStartDate();
                LocalDate endDate = LocalDate.now();

                // Collect all attendance for the school
                List<Attendance> allAttendance = new ArrayList<>();
                Map<UUID, List<Attendance>> attendanceByClassId = new LinkedHashMap<>();
                for (ClassRoom c : allClasses) {
                        List<Attendance> classAtt = attendanceRepository.findAllByClassRoomAndDateBetween(c, startDate, endDate);
                        allAttendance.addAll(classAtt);
                        attendanceByClassId.put(c.getId(), classAtt);
                }

                long totalRecords = allAttendance.size();
                long presentCount = allAttendance.stream().filter(a -> a.getStatus() == AttendanceStatus.PRESENT).count();
                double overallAttendanceRate = totalRecords > 0 ? (presentCount * 100.0 / totalRecords) : 0.0;

                // Count unique dates as "sessions"
                long totalSessions = allAttendance.stream()
                                .map(a -> a.getDate().toString() + "_" + a.getClassRoom().getId())
                                .distinct().count();

                // Attendance by class
                List<AttendanceReportDto.AttendanceByClassDto> attendanceByClass = allClasses.stream()
                                .map(c -> {
                                        List<Attendance> classAttendance = attendanceByClassId.getOrDefault(c.getId(), List.of());
                                        long classTotal = classAttendance.size();
                                        long classPresent = classAttendance.stream()
                                                        .filter(a -> a.getStatus() == AttendanceStatus.PRESENT).count();
                                        long classAbsent = classAttendance.stream()
                                                        .filter(a -> a.getStatus() == AttendanceStatus.ABSENT_UNEXCUSED).count();
                                        long classLate = classAttendance.stream()
                                                        .filter(a -> a.getStatus() == AttendanceStatus.LATE).count();
                                        long classExcused = classAttendance.stream()
                                                        .filter(a -> a.getStatus() == AttendanceStatus.ABSENT_EXCUSED).count();
                                        double classRate = classTotal > 0 ? (classPresent * 100.0 / classTotal) : 0.0;

                                        long classSessions = classAttendance.stream()
                                                        .map(a -> a.getDate().toString())
                                                        .distinct().count();

                                        return new AttendanceReportDto.AttendanceByClassDto(
                                                        c.getId(),
                                                        c.getName(),
                                                        c.getGrade(),
                                                        (int) classSessions,
                                                        Math.round(classRate * 100.0) / 100.0,
                                                        classPresent,
                                                        classAbsent,
                                                        classLate,
                                                        classExcused);
                                })
                                .filter(dto -> dto.totalSessions() > 0)
                                .sorted(Comparator.comparingInt(AttendanceReportDto.AttendanceByClassDto::grade)
                                                .thenComparing(AttendanceReportDto.AttendanceByClassDto::className))
                                .toList();

                // Chronic absentees (students with >= 5 absent days)
                Map<Student, Long> absentCountByStudent = allAttendance.stream()
                                .filter(a -> a.getStatus() == AttendanceStatus.ABSENT_UNEXCUSED
                                                || a.getStatus() == AttendanceStatus.ABSENT_EXCUSED)
                                .collect(Collectors.groupingBy(Attendance::getStudent, Collectors.counting()));

                List<AttendanceReportDto.ChronicAbsenteeDto> chronicAbsentees = absentCountByStudent.entrySet().stream()
                                .filter(e -> e.getValue() >= 5)
                                .map(e -> {
                                        Student s = e.getKey();
                                        long absentDays = e.getValue();
                                        List<ClassEnrollment> enrollments = enrollmentRepository.findAllByStudent(s);
                                        String className = enrollments.isEmpty() ? "N/A"
                                                        : enrollments.get(0).getClassRoom().getName();
                                        long studentTotalAttendance = allAttendance.stream()
                                                        .filter(a -> a.getStudent().getId().equals(s.getId()))
                                                        .count();
                                        double absentRate = studentTotalAttendance > 0
                                                        ? (absentDays * 100.0 / studentTotalAttendance)
                                                        : 0.0;

                                        return new AttendanceReportDto.ChronicAbsenteeDto(
                                                        s.getId(),
                                                        s.getStudentCode(),
                                                        s.getFullName(),
                                                        className,
                                                        (int) absentDays,
                                                        Math.round(absentRate * 100.0) / 100.0);
                                })
                                .sorted(Comparator.comparingInt(AttendanceReportDto.ChronicAbsenteeDto::absentDays)
                                                .reversed())
                                .toList();

                return new AttendanceReportDto(
                                totalSessions,
                                Math.round(overallAttendanceRate * 100.0) / 100.0,
                                attendanceByClass,
                                chronicAbsentees);
        }

        // ==================== ACADEMIC REPORTS ====================

        /**
         * Academic report. Grade has: type (REGULAR/MID_TERM/FINAL_TERM) + value (Double).
         * We compute weighted average per student-subject combination.
         */
        public AcademicReportDto getAcademicReport(School school, String academicYear, int semester) {
                if (academicYear == null || academicYear.isEmpty()) {
                        academicYear = getCurrentAcademicYear();
                }
                if (semester < 1 || semester > 2) {
                        semester = LocalDate.now().getMonthValue() >= 9 || LocalDate.now().getMonthValue() <= 1 ? 1 : 2;
                }

                List<Grade> allGrades = gradeRepository.findAllByClassRoom_SchoolAndAcademicYearAndSemester(
                                school, academicYear, semester);
                List<ClassRoom> allClasses = classRoomRepository.findAllBySchoolOrderByGradeAscNameAsc(school);

                long totalGradeRecords = allGrades.size();

                // Compute weighted average per student-subject
                // Group by student, then compute overall average across subjects
                Map<UUID, List<Grade>> gradesByStudentId = allGrades.stream()
                                .collect(Collectors.groupingBy(g -> g.getStudent().getId()));

                // Compute per-student average using weighted formula
                Map<UUID, Double> studentAverages = new LinkedHashMap<>();
                for (var entry : gradesByStudentId.entrySet()) {
                        double avg = computeWeightedAverage(entry.getValue());
                        if (avg >= 0) {
                                studentAverages.put(entry.getKey(), avg);
                        }
                }

                // Overall average
                double overallAvg = studentAverages.values().stream().mapToDouble(v -> v).average().orElse(0.0);
                java.math.BigDecimal overallAverageScore = java.math.BigDecimal.valueOf(overallAvg)
                                .setScale(2, java.math.RoundingMode.HALF_UP);

                // Grade distribution by ranges
                List<AcademicReportDto.GradeDistributionDto> gradeDistribution = new ArrayList<>();
                String[] ranges = { "0-2", "2-4", "4-6", "6-8", "8-10" };
                double[] mins = { 0, 2, 4, 6, 8 };
                double[] maxs = { 2, 4, 6, 8, 10.01 };
                long gradesWithScore = studentAverages.size();
                for (int i = 0; i < ranges.length; i++) {
                        final double min = mins[i];
                        final double max = maxs[i];
                        long count = studentAverages.values().stream()
                                        .filter(v -> v >= min && v < max)
                                        .count();
                        double percentage = gradesWithScore > 0
                                        ? Math.round(count * 100.0 / gradesWithScore * 100.0) / 100.0
                                        : 0;
                        gradeDistribution.add(new AcademicReportDto.GradeDistributionDto(ranges[i], count, percentage));
                }

                // Subject averages
                Map<Subject, List<Grade>> gradesBySubject = allGrades.stream()
                                .collect(Collectors.groupingBy(Grade::getSubject));
                List<AcademicReportDto.SubjectAverageDto> subjectAverages = gradesBySubject.entrySet().stream()
                                .map(e -> {
                                        double avg = computeWeightedAverage(e.getValue());
                                        return new AcademicReportDto.SubjectAverageDto(
                                                        e.getKey().getId(),
                                                        e.getKey().getName(),
                                                        java.math.BigDecimal.valueOf(Math.max(avg, 0))
                                                                        .setScale(2, java.math.RoundingMode.HALF_UP),
                                                        (long) e.getValue().size());
                                })
                                .sorted(Comparator.comparing(AcademicReportDto.SubjectAverageDto::averageScore)
                                                .reversed())
                                .toList();

                // Top students
                List<AcademicReportDto.TopStudentDto> topStudents = gradesByStudentId.entrySet().stream()
                                .map(e -> {
                                        Student s = e.getValue().get(0).getStudent();
                                        double avg = studentAverages.getOrDefault(s.getId(), 0.0);
                                        List<ClassEnrollment> enrollments = enrollmentRepository.findAllByStudent(s);
                                        String className = enrollments.isEmpty() ? "N/A"
                                                        : enrollments.get(0).getClassRoom().getName();
                                        String category = avg >= 8.5 ? "Giỏi"
                                                        : avg >= 6.5 ? "Khá"
                                                                        : avg >= 5 ? "TB" : "Yếu";
                                        return new AcademicReportDto.TopStudentDto(
                                                        s.getId(),
                                                        s.getStudentCode(),
                                                        s.getFullName(),
                                                        className,
                                                        java.math.BigDecimal.valueOf(avg)
                                                                        .setScale(2, java.math.RoundingMode.HALF_UP),
                                                        category);
                                })
                                .filter(dto -> dto.averageScore().doubleValue() >= 8.0)
                                .sorted(Comparator.comparing(AcademicReportDto.TopStudentDto::averageScore).reversed())
                                .limit(20)
                                .toList();

                // Class averages
                final String finalAcademicYear = academicYear;
                final int finalSemester = semester;
                List<AcademicReportDto.ClassAverageDto> classAverages = allClasses.stream()
                                .map(c -> {
                                        List<Grade> classGrades = gradeRepository.findAllByClassRoomAndSemester(c,
                                                        finalSemester);
                                        // Group by student and compute averages
                                        Map<UUID, List<Grade>> byStudent = classGrades.stream()
                                                        .collect(Collectors.groupingBy(g -> g.getStudent().getId()));
                                        List<Double> studentAvgs = byStudent.values().stream()
                                                        .map(this::computeWeightedAverage)
                                                        .filter(v -> v >= 0)
                                                        .toList();

                                        double avg = studentAvgs.stream().mapToDouble(v -> v).average().orElse(0.0);
                                        long count = studentAvgs.size();
                                        long excellent = studentAvgs.stream().filter(v -> v >= 8.5).count();
                                        long good = studentAvgs.stream().filter(v -> v >= 6.5 && v < 8.5).count();
                                        long average = studentAvgs.stream().filter(v -> v >= 5 && v < 6.5).count();
                                        long belowAverage = studentAvgs.stream().filter(v -> v < 5).count();

                                        return new AcademicReportDto.ClassAverageDto(
                                                        c.getId(),
                                                        c.getName(),
                                                        c.getGrade(),
                                                        java.math.BigDecimal.valueOf(avg)
                                                                        .setScale(2, java.math.RoundingMode.HALF_UP),
                                                        count,
                                                        excellent,
                                                        good,
                                                        average,
                                                        belowAverage);
                                })
                                .filter(dto -> dto.studentCount() > 0)
                                .sorted(Comparator.comparing(AcademicReportDto.ClassAverageDto::averageScore)
                                                .reversed())
                                .toList();

                return new AcademicReportDto(
                                totalGradeRecords,
                                academicYear,
                                semester,
                                overallAverageScore,
                                gradeDistribution,
                                subjectAverages,
                                topStudents,
                                classAverages);
        }

        // ==================== TIMETABLE REPORTS ====================

        public TimetableReportDto getTimetableReport(School school) {
                List<Timetable> allTimetables = timetableRepository.findAllBySchoolOrderByCreatedAtDesc(school);
                List<ClassRoom> allClasses = classRoomRepository.findAllBySchoolOrderByGradeAscNameAsc(school);
                String currentAcademicYear = getCurrentAcademicYear();
                int currentSemester = LocalDate.now().getMonthValue() >= 9 || LocalDate.now().getMonthValue() <= 1 ? 1
                                : 2;

                long totalTimetables = allTimetables.size();
                long officialTimetables = allTimetables.stream()
                                .filter(t -> t.getStatus() == com.schoolmanagement.backend.domain.TimetableStatus.OFFICIAL)
                                .count();
                long draftTimetables = allTimetables.stream()
                                .filter(t -> t.getStatus() == com.schoolmanagement.backend.domain.TimetableStatus.DRAFT)
                                .count();

                List<TimetableReportDto.TimetableSummaryDto> timetableSummaries = allTimetables.stream()
                                .map(t -> {
                                        int totalSlots = t.getTimetableDetails().size();
                                        int filledSlots = (int) t.getTimetableDetails().stream()
                                                        .filter(d -> d.getSubject() != null && d.getTeacher() != null)
                                                        .count();
                                        return new TimetableReportDto.TimetableSummaryDto(
                                                        t.getId(),
                                                        t.getName(),
                                                        t.getAcademicYear(),
                                                        t.getSemester(),
                                                        t.getStatus().name(),
                                                        t.getCreatedAt().toString(),
                                                        totalSlots,
                                                        filledSlots);
                                })
                                .toList();

                List<TimetableReportDto.ClassTimetableStatusDto> classStatuses = allClasses.stream()
                                .map(c -> {
                                        boolean hasTimetable = allTimetables.stream()
                                                        .filter(t -> t.getStatus() == com.schoolmanagement.backend.domain.TimetableStatus.OFFICIAL)
                                                        .anyMatch(t -> t.getTimetableDetails().stream()
                                                                        .anyMatch(d -> d.getClassRoom().getId()
                                                                                        .equals(c.getId())));
                                        int totalSlots = 0;
                                        int filledSlots = 0;
                                        for (Timetable t : allTimetables) {
                                                if (t.getStatus() == com.schoolmanagement.backend.domain.TimetableStatus.OFFICIAL) {
                                                        for (TimetableDetail d : t.getTimetableDetails()) {
                                                                if (d.getClassRoom().getId().equals(c.getId())) {
                                                                        totalSlots++;
                                                                        if (d.getSubject() != null
                                                                                        && d.getTeacher() != null) {
                                                                                filledSlots++;
                                                                        }
                                                                }
                                                        }
                                                }
                                        }
                                        double fillRate = totalSlots > 0
                                                        ? Math.round(filledSlots * 100.0 / totalSlots * 100.0) / 100.0
                                                        : 0;
                                        return new TimetableReportDto.ClassTimetableStatusDto(
                                                        c.getId(),
                                                        c.getName(),
                                                        c.getGrade(),
                                                        hasTimetable,
                                                        totalSlots,
                                                        filledSlots,
                                                        fillRate);
                                })
                                .toList();

                long classesWithTimetable = classStatuses.stream()
                                .filter(TimetableReportDto.ClassTimetableStatusDto::hasTimetable).count();
                long classesWithoutTimetable = allClasses.size() - classesWithTimetable;
                double coverageRate = allClasses.size() > 0
                                ? Math.round(classesWithTimetable * 100.0 / allClasses.size() * 100.0) / 100.0
                                : 0;
                TimetableReportDto.TimetableCoverageDto coverage = new TimetableReportDto.TimetableCoverageDto(
                                allClasses.size(),
                                classesWithTimetable,
                                classesWithoutTimetable,
                                coverageRate);

                return new TimetableReportDto(
                                totalTimetables,
                                officialTimetables,
                                draftTimetables,
                                currentAcademicYear,
                                currentSemester,
                                timetableSummaries,
                                classStatuses,
                                coverage);
        }

        // ==================== HELPER METHODS ====================

        /**
         * Compute weighted average from a list of grades.
         * REGULAR (weight 1), MID_TERM (weight 2), FINAL_TERM (weight 3)
         * Returns -1 if no valid grades.
         */
        private double computeWeightedAverage(List<Grade> grades) {
                double totalWeight = 0;
                double totalScore = 0;

                for (Grade g : grades) {
                        if (g.getValue() == null) continue;
                        int weight = switch (g.getType()) {
                                case REGULAR -> 1;
                                case MID_TERM -> 2;
                                case FINAL_TERM -> 3;
                        };
                        totalScore += g.getValue() * weight;
                        totalWeight += weight;
                }

                return totalWeight > 0 ? totalScore / totalWeight : -1;
        }

        private LocalDate getAcademicYearStartDate() {
                LocalDate now = LocalDate.now();
                int year = now.getMonthValue() >= 9 ? now.getYear() : now.getYear() - 1;
                return LocalDate.of(year, 9, 1);
        }

        private String getCurrentAcademicYear() {
                LocalDate now = LocalDate.now();
                int year = now.getYear();
                int month = now.getMonthValue();
                if (month >= 9) {
                        return year + "-" + (year + 1);
                } else {
                        return (year - 1) + "-" + year;
                }
        }

        private List<EnrollmentStatDto> getEnrollmentStatsByMonth(List<Student> students) {
                int currentYear = LocalDate.now().getYear();
                Map<Integer, Long> enrollmentByMonth = students.stream()
                                .filter(s -> s.getEnrollmentDate() != null
                                                && s.getEnrollmentDate().getYear() == currentYear)
                                .collect(Collectors.groupingBy(s -> s.getEnrollmentDate().getMonthValue(),
                                                Collectors.counting()));

                List<EnrollmentStatDto> stats = new ArrayList<>();
                for (int month = 1; month <= 12; month++) {
                        stats.add(new EnrollmentStatDto(currentYear, month, enrollmentByMonth.getOrDefault(month, 0L)));
                }
                return stats;
        }
}
