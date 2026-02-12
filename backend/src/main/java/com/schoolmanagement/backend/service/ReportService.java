package com.schoolmanagement.backend.service;

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
import com.schoolmanagement.backend.dto.report.EnrollmentTrendDto.EnrollmentByGradeDto;
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
        private final AttendanceSessionRepository attendanceSessionRepository;
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
                        // Count students per grade by enrollment
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

        /**
         * Lấy danh sách học sinh chi tiết theo lớp
         */
        public StudentDetailedListDto getStudentsByClass(School school, UUID classId) {
                // Validate class belongs to school
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

        /**
         * Lấy danh sách học sinh chưa có tài khoản
         */
        public StudentsWithoutAccountDto getStudentsWithoutAccount(School school) {
                List<Student> studentsNoAccount = studentRepository.findAllBySchoolOrderByFullNameAsc(school).stream()
                                .filter(s -> s.getUser() == null && s.getStatus() == StudentStatus.ACTIVE)
                                .toList();

                // Group by class
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

        /**
         * Lấy thống kê nhập học theo năm học (chi tiết hơn)
         */
        public EnrollmentTrendDto getEnrollmentTrend(School school, String academicYear) {
                List<Student> allStudents = studentRepository.findAllBySchoolOrderByFullNameAsc(school);

                // Parse academic year (e.g., "2024-2025")
                int startYear;
                try {
                        startYear = Integer.parseInt(academicYear.split("-")[0]);
                } catch (Exception e) {
                        startYear = LocalDate.now().getYear();
                }

                final int year = startYear;

                // Enrollment by month for the academic year (Sep-Aug)
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

                // Enrollment by grade
                Map<Integer, Long> byGrade = allStudents.stream()
                                .filter(s -> s.getEnrollmentDate() != null
                                                && ((s.getEnrollmentDate().getYear() == year
                                                                && s.getEnrollmentDate().getMonthValue() >= 9)
                                                                || (s.getEnrollmentDate().getYear() == year + 1
                                                                                && s.getEnrollmentDate()
                                                                                                .getMonthValue() <= 8)))
                                .collect(Collectors.groupingBy(s -> {
                                        // Find the grade of the student's class
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

                // Teachers by subject (Count teacher for EACH subject they teach)
                Map<com.schoolmanagement.backend.domain.entity.Subject, Long> teachersBySubject = allTeachers.stream()
                                .flatMap(t -> t.getSubjects().stream())
                                .collect(Collectors.groupingBy(Function.identity(), Collectors.counting()));

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
                                        // Assuming each assignment = 1 class, periods = sum of all
                                        int assignedClasses = assignments.size();
                                        int totalPeriods = assignments.stream()
                                                        .mapToInt(TeacherAssignment::getLessonsPerWeek)
                                                        .sum();

                                        String primarySubjectName = t.getSubjects().stream()
                                                        .map(com.schoolmanagement.backend.domain.entity.Subject::getName)
                                                        .collect(Collectors.joining(", "));
                                        if (primarySubjectName.isEmpty()) {
                                                primarySubjectName = "N/A";
                                        }

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

                // Classes by grade
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
         * Lấy báo cáo điểm danh tổng hợp
         * NOTE: Tạm thời trả về báo cáo trống do conflict schema với AttendanceSession
         * Cần refactor lại khi merge hoàn tất
         */
        public AttendanceReportDto getAttendanceReport(School school) {
                // TODO: Re-implement when AttendanceSession entity is properly merged
                return new AttendanceReportDto(
                                0L,  // totalSessions
                                0.0, // overallAttendanceRate
                                new ArrayList<>(), // attendanceByClass
                                new ArrayList<>()  // chronicAbsentees
                );
        }

        // ==================== ACADEMIC REPORTS ====================

        /**
         * Lấy báo cáo học tập tổng hợp
         */
        public AcademicReportDto getAcademicReport(School school, String academicYear, int semester) {
                if (academicYear == null || academicYear.isEmpty()) {
                        academicYear = getCurrentAcademicYear();
                }
                if (semester < 1 || semester > 2) {
                        semester = LocalDate.now().getMonthValue() >= 9 || LocalDate.now().getMonthValue() <= 1 ? 1 : 2;
                }

                List<Grade> allGrades = gradeRepository.findAllBySchoolAndAcademicYearAndSemester(school, academicYear,
                                semester);
                List<ClassRoom> allClasses = classRoomRepository.findAllBySchoolOrderByGradeAscNameAsc(school);

                long totalGradeRecords = allGrades.size();

                // Overall average score
                java.math.BigDecimal overallAverage = allGrades.stream()
                                .filter(g -> g.getAverageScore() != null)
                                .map(Grade::getAverageScore)
                                .reduce(java.math.BigDecimal.ZERO, java.math.BigDecimal::add);
                long gradesWithScore = allGrades.stream().filter(g -> g.getAverageScore() != null).count();
                java.math.BigDecimal overallAverageScore = gradesWithScore > 0
                                ? overallAverage.divide(java.math.BigDecimal.valueOf(gradesWithScore), 2,
                                                java.math.RoundingMode.HALF_UP)
                                : java.math.BigDecimal.ZERO;

                // Grade distribution by ranges
                List<AcademicReportDto.GradeDistributionDto> gradeDistribution = new ArrayList<>();
                String[] ranges = { "0-2", "2-4", "4-6", "6-8", "8-10" };
                double[] mins = { 0, 2, 4, 6, 8 };
                double[] maxs = { 2, 4, 6, 8, 10.01 };
                for (int i = 0; i < ranges.length; i++) {
                        final double min = mins[i];
                        final double max = maxs[i];
                        long count = allGrades.stream()
                                        .filter(g -> g.getAverageScore() != null)
                                        .filter(g -> g.getAverageScore().doubleValue() >= min
                                                        && g.getAverageScore().doubleValue() < max)
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
                                        java.math.BigDecimal sum = e.getValue().stream()
                                                        .filter(g -> g.getAverageScore() != null)
                                                        .map(Grade::getAverageScore)
                                                        .reduce(java.math.BigDecimal.ZERO, java.math.BigDecimal::add);
                                        long count = e.getValue().stream().filter(g -> g.getAverageScore() != null)
                                                        .count();
                                        java.math.BigDecimal avg = count > 0
                                                        ? sum.divide(java.math.BigDecimal.valueOf(count), 2,
                                                                        java.math.RoundingMode.HALF_UP)
                                                        : java.math.BigDecimal.ZERO;
                                        return new AcademicReportDto.SubjectAverageDto(
                                                        e.getKey().getId(),
                                                        e.getKey().getName(),
                                                        avg,
                                                        count);
                                })
                                .sorted(Comparator.comparing(AcademicReportDto.SubjectAverageDto::averageScore)
                                                .reversed())
                                .toList();

                // Top students
                Map<Student, List<Grade>> gradesByStudent = allGrades.stream()
                                .collect(Collectors.groupingBy(Grade::getStudent));
                List<AcademicReportDto.TopStudentDto> topStudents = gradesByStudent.entrySet().stream()
                                .map(e -> {
                                        Student s = e.getKey();
                                        java.math.BigDecimal sum = e.getValue().stream()
                                                        .filter(g -> g.getAverageScore() != null)
                                                        .map(Grade::getAverageScore)
                                                        .reduce(java.math.BigDecimal.ZERO, java.math.BigDecimal::add);
                                        long count = e.getValue().stream().filter(g -> g.getAverageScore() != null)
                                                        .count();
                                        java.math.BigDecimal avg = count > 0
                                                        ? sum.divide(java.math.BigDecimal.valueOf(count), 2,
                                                                        java.math.RoundingMode.HALF_UP)
                                                        : java.math.BigDecimal.ZERO;
                                        List<ClassEnrollment> enrollments = enrollmentRepository.findAllByStudent(s);
                                        String className = enrollments.isEmpty() ? "N/A"
                                                        : enrollments.get(0).getClassRoom().getName();
                                        String category = avg.doubleValue() >= 8.5 ? "Giỏi"
                                                        : avg.doubleValue() >= 6.5 ? "Khá"
                                                                        : avg.doubleValue() >= 5 ? "TB" : "Yếu";
                                        return new AcademicReportDto.TopStudentDto(
                                                        s.getId(),
                                                        s.getStudentCode(),
                                                        s.getFullName(),
                                                        className,
                                                        avg,
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
                                        java.math.BigDecimal sum = classGrades.stream()
                                                        .filter(g -> g.getAverageScore() != null)
                                                        .map(Grade::getAverageScore)
                                                        .reduce(java.math.BigDecimal.ZERO, java.math.BigDecimal::add);
                                        long count = classGrades.stream().filter(g -> g.getAverageScore() != null)
                                                        .count();
                                        java.math.BigDecimal avg = count > 0
                                                        ? sum.divide(java.math.BigDecimal.valueOf(count), 2,
                                                                        java.math.RoundingMode.HALF_UP)
                                                        : java.math.BigDecimal.ZERO;
                                        long excellent = classGrades.stream()
                                                        .filter(g -> g.getAverageScore() != null
                                                                        && g.getAverageScore().doubleValue() >= 8.5)
                                                        .count();
                                        long good = classGrades.stream()
                                                        .filter(g -> g.getAverageScore() != null
                                                                        && g.getAverageScore().doubleValue() >= 6.5
                                                                        && g.getAverageScore().doubleValue() < 8.5)
                                                        .count();
                                        long average = classGrades.stream()
                                                        .filter(g -> g.getAverageScore() != null
                                                                        && g.getAverageScore().doubleValue() >= 5
                                                                        && g.getAverageScore().doubleValue() < 6.5)
                                                        .count();
                                        long belowAverage = classGrades.stream()
                                                        .filter(g -> g.getAverageScore() != null
                                                                        && g.getAverageScore().doubleValue() < 5)
                                                        .count();
                                        return new AcademicReportDto.ClassAverageDto(
                                                        c.getId(),
                                                        c.getName(),
                                                        c.getGrade(),
                                                        avg,
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

        /**
         * Lấy báo cáo thời khóa biểu
         */
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

                // Timetable summaries
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

                // Class timetable statuses
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

                // Coverage
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
