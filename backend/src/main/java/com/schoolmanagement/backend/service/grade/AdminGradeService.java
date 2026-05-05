package com.schoolmanagement.backend.service.grade;

import com.schoolmanagement.backend.domain.entity.admin.AcademicYear;
import com.schoolmanagement.backend.domain.entity.admin.School;
import com.schoolmanagement.backend.domain.entity.admin.Semester;
import com.schoolmanagement.backend.domain.entity.auth.User;
import com.schoolmanagement.backend.domain.entity.classes.ClassEnrollment;
import com.schoolmanagement.backend.domain.entity.classes.ClassRoom;
import com.schoolmanagement.backend.domain.entity.classes.Subject;
import com.schoolmanagement.backend.domain.entity.grade.Grade;
import com.schoolmanagement.backend.domain.entity.grade.GradeEntryLock;
import com.schoolmanagement.backend.domain.entity.grade.GradeHistory;
import com.schoolmanagement.backend.domain.entity.grade.GradingConfig;
import com.schoolmanagement.backend.domain.entity.grade.RegularScore;
import com.schoolmanagement.backend.domain.entity.grade.StudentRanking;
import com.schoolmanagement.backend.domain.entity.student.Student;
import com.schoolmanagement.backend.domain.entity.teacher.TeacherAssignment;
import com.schoolmanagement.backend.dto.grade.GradeBookDto;
import com.schoolmanagement.backend.dto.grade.GradeEntryStatusDto;
import com.schoolmanagement.backend.dto.grade.GradeHistoryDto;
import com.schoolmanagement.backend.dto.grade.GradingConfigDto;
import com.schoolmanagement.backend.dto.grade.StudentRankingDto;
import com.schoolmanagement.backend.repo.classes.ClassEnrollmentRepository;
import com.schoolmanagement.backend.repo.classes.ClassRoomRepository;
import com.schoolmanagement.backend.repo.classes.SubjectRepository;
import com.schoolmanagement.backend.repo.grade.GradeEntryLockRepository;
import com.schoolmanagement.backend.repo.grade.GradeHistoryRepository;
import com.schoolmanagement.backend.repo.grade.GradeRepository;
import com.schoolmanagement.backend.repo.grade.GradingConfigRepository;
import com.schoolmanagement.backend.repo.grade.StudentRankingRepository;
import com.schoolmanagement.backend.repo.student.StudentRepository;
import com.schoolmanagement.backend.repo.teacher.TeacherAssignmentRepository;
import com.schoolmanagement.backend.service.admin.SemesterService;
import com.schoolmanagement.backend.util.StudentSortUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Service for School Admin grade management operations.
 * Handles weight configuration, grade entry locking, and progress monitoring.
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class AdminGradeService {

        private final GradingConfigRepository gradingConfigRepository;
        private final GradeEntryLockRepository gradeEntryLockRepository;
        private final GradeHistoryRepository gradeHistoryRepository;
        private final GradeRepository gradeRepository;
        private final StudentRankingRepository studentRankingRepository;
        private final ClassRoomRepository classRoomRepository;
        private final ClassEnrollmentRepository classEnrollmentRepository;
        private final TeacherAssignmentRepository teacherAssignmentRepository;
        private final SubjectRepository subjectRepository;
        private final StudentRepository studentRepository;
        private final SemesterService semesterService;
        private final GradeCalculationHelper gradeCalculationHelper;
        private final GradeGovernanceHelper gradeGovernanceHelper;

        // ==================== WEIGHT CONFIGURATION ====================

        /**
         * Get the current grading weight configuration for a school.
         */
        public GradingConfigDto getGradingConfig(School school) {
                GradingConfig config = gradingConfigRepository.findBySchool(school)
                                .orElse(GradingConfig.defaultConfig());

                return GradingConfigDto.builder()
                                .regularWeight(config.getRegularWeight())
                                .midtermWeight(config.getMidtermWeight())
                                .finalWeight(config.getFinalWeight())
                                .updatedAt(config.getUpdatedAt() != null ? config.getUpdatedAt().toString() : null)
                                .updatedBy(config.getUpdatedBy() != null ? config.getUpdatedBy().getFullName() : null)
                                .build();
        }

        /**
         * Update the grading weight configuration for a school.
         */
        @Transactional
        public GradingConfigDto updateGradingConfig(School school, User admin, GradingConfigDto dto) {
                // Validate weights
                if (dto.getRegularWeight() < 1 || dto.getMidtermWeight() < 1 || dto.getFinalWeight() < 1) {
                        throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                                        "Hệ số phải lớn hơn hoặc bằng 1.");
                }
                if (dto.getRegularWeight() > 10 || dto.getMidtermWeight() > 10 || dto.getFinalWeight() > 10) {
                        throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                                        "Hệ số không được vượt quá 10.");
                }

                GradingConfig config = gradingConfigRepository.findBySchool(school)
                                .orElseGet(() -> GradingConfig.builder().school(school).build());

                config.setRegularWeight(dto.getRegularWeight());
                config.setMidtermWeight(dto.getMidtermWeight());
                config.setFinalWeight(dto.getFinalWeight());
                config.setUpdatedBy(admin);
                config.setUpdatedAt(Instant.now());

                config = gradingConfigRepository.save(config);
                log.info("[AdminGrade] Updated grading config for school {}: regular={}, midterm={}, final={}",
                                school.getId(), config.getRegularWeight(), config.getMidtermWeight(),
                                config.getFinalWeight());

                return GradingConfigDto.builder()
                                .regularWeight(config.getRegularWeight())
                                .midtermWeight(config.getMidtermWeight())
                                .finalWeight(config.getFinalWeight())
                                .updatedAt(config.getUpdatedAt().toString())
                                .updatedBy(admin.getFullName())
                                .build();
        }

        // ==================== GRADE ENTRY LOCKING ====================

        /**
         * Lock grade entry for a specific class in a semester.
         */
        @Transactional
        public void lockGradeEntry(School school, User admin, UUID classId, UUID semesterId, String reason) {
                ClassRoom classRoom = classRoomRepository.findById(classId)
                                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                                                "Lớp không tồn tại"));

                if (!classRoom.getSchool().getId().equals(school.getId())) {
                        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Lớp không thuộc trường của bạn.");
                }

                Semester semester = semesterService.getSemester(semesterId);

                GradeEntryLock lock = gradeEntryLockRepository
                                .findByClassRoomAndSemester(classRoom, semester)
                                .orElseGet(() -> GradeEntryLock.builder()
                                                .classRoom(classRoom)
                                                .semester(semester)
                                                .build());

                lock.setLocked(true);
                lock.setLockedBy(admin);
                lock.setLockedAt(Instant.now());
                lock.setReason(reason);

                gradeEntryLockRepository.save(lock);
                log.info("[AdminGrade] Locked grade entry: class={}, semester={}, by={}",
                                classRoom.getName(), semester.getName(), admin.getEmail());
        }

        /**
         * Unlock grade entry for a specific class in a semester.
         */
        @Transactional
        public void unlockGradeEntry(School school, User admin, UUID classId, UUID semesterId) {
                ClassRoom classRoom = classRoomRepository.findById(classId)
                                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                                                "Lớp không tồn tại"));

                if (!classRoom.getSchool().getId().equals(school.getId())) {
                        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Lớp không thuộc trường của bạn.");
                }

                Semester semester = semesterService.getSemester(semesterId);

                gradeEntryLockRepository.findByClassRoomAndSemester(classRoom, semester)
                                .ifPresent(lock -> {
                                        lock.setLocked(false);
                                        lock.setLockedBy(admin);
                                        lock.setLockedAt(Instant.now());
                                        lock.setReason("Mở khóa bởi Admin");
                                        gradeEntryLockRepository.save(lock);
                                });

                log.info("[AdminGrade] Unlocked grade entry: class={}, semester={}, by={}",
                                classRoom.getName(), semester.getName(), admin.getEmail());
        }

        // ==================== GRADE ENTRY STATUS ====================

        /**
         * Get a summary of grade entry progress for all classes in a semester.
         */
        public GradeEntryStatusDto getGradeEntryStatus(School school, UUID semesterId) {
                Semester semester = semesterId != null
                                ? semesterService.getSemester(semesterId)
                                : semesterService.getActiveSemesterEntity(school);

                List<ClassRoom> allClassRooms = classRoomRepository.findAllBySchoolAndAcademicYear(school, semester.getAcademicYear());
                List<ClassRoom> classRooms = new ArrayList<>(allClassRooms);
                sortClassesByGradeAndName(classRooms);

                List<GradeEntryLock> locks = gradeEntryLockRepository.findAllBySemester(semester);
                Set<UUID> lockedClassIds = locks.stream()
                                .filter(GradeEntryLock::isLocked)
                                .map(l -> l.getClassRoom().getId())
                                .collect(Collectors.toSet());

                List<ClassEnrollment> allEnrollments = classEnrollmentRepository.findAllByClassRoomIn(classRooms);
                Map<UUID, Long> studentCountByClass = allEnrollments.stream()
                                .collect(Collectors.groupingBy(e -> e.getClassRoom().getId(), Collectors.counting()));

                List<TeacherAssignment> allAssignments = teacherAssignmentRepository.findAllBySchoolWithDetails(school);
                Map<UUID, List<TeacherAssignment>> assignmentsByClass = allAssignments.stream()
                                .filter(a -> a.getClassRoom() != null && a.getSubject() != null)
                                .collect(Collectors.groupingBy(a -> a.getClassRoom().getId()));

                List<Grade> allGrades = gradeRepository.findAllBySchoolAndSemester(school, semester);
                
                // Map<ClassId, Map<SubjectId, List<Grade>>>
                Map<UUID, Map<UUID, List<Grade>>> gradesByClassAndSubject = allGrades.stream()
                                .filter(g -> g.getClassRoom() != null && g.getSubject() != null)
                                .collect(Collectors.groupingBy(
                                                g -> g.getClassRoom().getId(),
                                                Collectors.groupingBy(g -> g.getSubject().getId())
                                ));

                List<GradeEntryStatusDto.ClassEntryStatus> classStatuses = new ArrayList<>();
                int totalCompletedClasses = 0;
                int globalTotalMidterm = 0;
                int globalFilledMidterm = 0;
                int globalTotalFinal = 0;
                int globalFilledFinal = 0;

                for (ClassRoom classRoom : classRooms) {
                        long studentCount = studentCountByClass.getOrDefault(classRoom.getId(), 0L);
                        if (studentCount == 0) continue;

                        List<TeacherAssignment> classAssignments = assignmentsByClass.getOrDefault(classRoom.getId(), new ArrayList<>());
                        if (classAssignments.isEmpty()) continue;

                        Map<UUID, List<Grade>> subjectGradesMap = gradesByClassAndSubject.getOrDefault(classRoom.getId(), new HashMap<>());

                        int totalStudents = (int) studentCount;
                        List<GradeEntryStatusDto.SubjectEntryStatus> subjectStatuses = new ArrayList<>();
                        int classTotalExpected = 0;
                        int classTotalActual = 0;
                        int completedSubjects = 0;

                        for (TeacherAssignment ta : classAssignments) {
                                List<Grade> gradesForSubject = subjectGradesMap.getOrDefault(ta.getSubject().getId(), new ArrayList<>());
                                
                                GradeEntryStatusDto.SubjectEntryStatus subStatus = calculateSubjectStatus(ta.getSubject(), totalStudents, gradesForSubject);
                                subjectStatuses.add(subStatus);
                                
                                if (subStatus.isComplete()) completedSubjects++;
                                classTotalExpected += totalStudents;
                                classTotalActual += subStatus.getFinalEntered();

                                globalTotalMidterm += totalStudents;
                                globalFilledMidterm += subStatus.getMidtermEntered();
                                globalTotalFinal += totalStudents;
                                globalFilledFinal += subStatus.getFinalEntered();
                        }

                        double classPct = classTotalExpected > 0 ? (classTotalActual * 100.0 / classTotalExpected) : 0;
                        boolean isClassComplete = classTotalActual >= classTotalExpected && classTotalExpected > 0;
                        if (isClassComplete) totalCompletedClasses++;
                        
                        classStatuses.add(GradeEntryStatusDto.ClassEntryStatus.builder()
                                        .classId(classRoom.getId().toString())
                                        .className(classRoom.getName())
                                        .grade(classRoom.getGrade())
                                        .totalSubjects(classAssignments.size())
                                        .completedSubjects(completedSubjects)
                                        .totalStudents(totalStudents)
                                        .totalGradeEntries(classTotalActual)
                                        .expectedGradeEntries(classTotalExpected)
                                        .completionPercentage(Math.min(classPct, 100.0))
                                        .isLocked(lockedClassIds.contains(classRoom.getId()))
                                        .subjects(subjectStatuses)
                                        .build());
                }

                return GradeEntryStatusDto.builder()
                                .totalClasses(classStatuses.size())
                                .completedClasses(totalCompletedClasses)
                                .totalMidtermGrades(globalTotalMidterm)
                                .filledMidtermGrades(globalFilledMidterm)
                                .totalFinalGrades(globalTotalFinal)
                                .filledFinalGrades(globalFilledFinal)
                                .completionPercentage(globalTotalFinal > 0 ? Math.min(globalFilledFinal * 100.0 / globalTotalFinal, 100.0) : 0)
                                .classStatuses(classStatuses)
                                .build();
        }

        private GradeEntryStatusDto.SubjectEntryStatus calculateSubjectStatus(Subject subject, int totalStudents, List<Grade> grades) {
                long txEntered = grades.stream().filter(g -> !g.getRegularScores().isEmpty()).count();
                long midEntered = grades.stream().filter(g -> g.getMidtermScore() != null).count();
                long finalEntered = grades.stream().filter(g -> g.getFinalScore() != null).count();
                
                boolean isComplete = finalEntered >= totalStudents && totalStudents > 0;
                
                return GradeEntryStatusDto.SubjectEntryStatus.builder()
                                .subjectId(subject.getId().toString())
                                .subjectName(subject.getName())
                                .totalStudents(totalStudents)
                                .txEntered((int) txEntered)
                                .midtermEntered((int) midEntered)
                                .finalEntered((int) finalEntered)
                                .completionPercentage(totalStudents > 0 ? (finalEntered * 100.0 / totalStudents) : 0)
                                .isComplete(isComplete)
                                .build();
        }

        private void sortClassesByGradeAndName(List<ClassRoom> classRooms) {
                classRooms.sort((c1, c2) -> {
                        int gradeCmp = Integer.compare(c1.getGrade(), c2.getGrade());
                        if (gradeCmp != 0) return gradeCmp;
                        
                        String n1 = c1.getName();
                        String n2 = c2.getName();
                        
                        String[] parts1 = n1.split("(?<=\\D)(?=\\d)|(?<=\\d)(?=\\D)");
                        String[] parts2 = n2.split("(?<=\\D)(?=\\d)|(?<=\\d)(?=\\D)");
                        
                        int i = 0;
                        while (i < parts1.length && i < parts2.length) {
                                String p1 = parts1[i];
                                String p2 = parts2[i];
                                
                                if (Character.isDigit(p1.charAt(0)) && Character.isDigit(p2.charAt(0))) {
                                        try {
                                                long v1 = Long.parseLong(p1);
                                                long v2 = Long.parseLong(p2);
                                                if (v1 != v2) return Long.compare(v1, v2);
                                        } catch (NumberFormatException e) {
                                                int cmp = p1.compareTo(p2);
                                                if (cmp != 0) return cmp;
                                        }
                                } else {
                                        int cmp = p1.compareTo(p2);
                                        if (cmp != 0) return cmp;
                                }
                                i++;
                        }
                        return Integer.compare(parts1.length, parts2.length);
                });
        }

        // ==================== GRADE HISTORY / AUDIT ====================

        /**
         * Get paginated audit logs (GradeHistory) for a class or semester.
         */
        public Page<GradeHistoryDto> getGradeHistory(
                        School school, UUID semesterId, UUID classId, int page, int size) {

                Semester semester = semesterId != null
                                ? semesterService.getSemester(semesterId)
                                : semesterService.getActiveSemesterEntity(school);

                Pageable pageable = PageRequest.of(page, size);
                Page<GradeHistory> histories;

                if (classId != null) {
                        ClassRoom classRoom = classRoomRepository.findById(classId)
                                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                                                        "Lớp không tồn tại"));

                        if (!classRoom.getSchool().getId().equals(school.getId())) {
                                throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                                                "Lớp không thuộc trường của bạn.");
                        }

                        histories = gradeHistoryRepository
                                        .findAllByGrade_ClassRoomAndGrade_SemesterOrderByChangedAtDesc(classRoom,
                                                        semester, pageable);
                } else {
                        histories = gradeHistoryRepository.findAllByGrade_SemesterOrderByChangedAtDesc(semester,
                                        pageable);
                }

                return histories.map(history -> GradeHistoryDto.builder()
                                .id(history.getId())
                                .studentName(history.getGrade().getStudent().getFullName())
                                .studentCode(history.getGrade().getStudent().getStudentCode())
                                .subjectName(history.getGrade().getSubject().getName())
                                .fieldChanged(history.getFieldChanged())
                                .oldValue(history.getOldValue())
                                .newValue(history.getNewValue())
                                .changedBy(history.getChangedBy().getFullName())
                                .changedAt(history.getChangedAt().toString())
                                .reason(history.getReason())
                                .build());
        }

        // ==================== RANKING / GPA ====================

        /**
         * Calculate and update GPA and class rankings for all students in a class.
         */
        @Transactional
        public List<StudentRankingDto> calculateClassRankings(School school, User admin, UUID classId,
                        UUID semesterId) {
                ClassRoom classRoom = classRoomRepository.findById(classId)
                                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                                                "Lớp không tồn tại"));

                if (!classRoom.getSchool().getId().equals(school.getId())) {
                        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Lớp không thuộc trường của bạn.");
                }

                Semester semester = semesterId != null
                                ? semesterService.getSemester(semesterId)
                                : semesterService.getActiveSemesterEntity(school);

                // Fetch all enrolled students
                List<ClassEnrollment> enrollments = classEnrollmentRepository
                                .findAllByClassRoom(classRoom);


                // Fetch all grades for this class and semester
                List<Grade> classGrades = gradeRepository
                                .findAllByClassRoomAndSemester(classRoom, semester);

                // Group grades by student
                Map<UUID, List<Grade>> gradesByStudent = classGrades
                                .stream()
                                .filter(g -> g.getAverageScore() != null)
                                .collect(Collectors.groupingBy(g -> g.getStudent().getId()));

                List<StudentRanking> rankings = new ArrayList<>();

                for (ClassEnrollment enrollment : enrollments) {
                        Student student = enrollment.getStudent();
                        List<Grade> studentGrades = gradesByStudent
                                        .getOrDefault(student.getId(), new ArrayList<>());

                        double totalGpa = 0.0;
                        int count = 0;

                        for (Grade g : studentGrades) {
                                totalGpa += g.getAverageScore().doubleValue();
                                count++;
                        }

                        BigDecimal gpa = count > 0 ? BigDecimal.valueOf(Math.round((totalGpa / count) * 100.0) / 100.0)
                                        : null;
                        String performance = gpa != null ? classifyPerformance(gpa) : null;

                        StudentRanking ranking = studentRankingRepository
                                        .findByStudentAndSemester(student, semester)
                                        .orElseGet(() -> StudentRanking.builder()
                                                        .student(student)
                                                        .classRoom(classRoom)
                                                        .semester(semester)
                                                        .build());

                        ranking.setGpa(gpa);
                        ranking.setPerformanceCategory(performance);
                        ranking.setUpdatedAt(Instant.now());
                        rankings.add(ranking);
                }

                // Save all to generate IDs if new
                rankings = studentRankingRepository.saveAll(rankings);

                // Sort by GPA descending to determine ranks
                List<StudentRanking> validRankings = rankings.stream()
                                .filter(r -> r.getGpa() != null)
                                .sorted((r1, r2) -> r2.getGpa().compareTo(r1.getGpa()))
                                .collect(Collectors.toList());

                int currentRank = 1;
                for (int i = 0; i < validRankings.size(); i++) {
                        if (i > 0 && validRankings.get(i).getGpa().compareTo(validRankings.get(i - 1).getGpa()) == 0) {
                                validRankings.get(i).setRankInClass(validRankings.get(i - 1).getRankInClass());
                        } else {
                                validRankings.get(i).setRankInClass(currentRank);
                        }
                        currentRank++;
                }

                List<StudentRanking> nullGpaRankings = rankings
                                .stream()
                                .filter(r -> r.getGpa() == null)
                                .collect(Collectors.toList());
                for (StudentRanking r : nullGpaRankings) {
                        r.setRankInClass(null);
                }

                studentRankingRepository.saveAll(rankings);
                log.info("[AdminGrade] Calculated rankings for class {}, semester {}", classRoom.getName(),
                                semester.getName());

                return rankings.stream()
                                .map(this::mapToRankingDto)
                                .collect(Collectors.toList());
        }

        /**
         * Get class rankings without recalculating.
         */
        public List<StudentRankingDto> getClassRankings(School school, UUID classId, UUID semesterId) {
                ClassRoom classRoom = classRoomRepository.findById(classId)
                                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                                                "Lớp không tồn tại"));

                if (!classRoom.getSchool().getId().equals(school.getId())) {
                        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Lớp không thuộc trường của bạn.");
                }

                Semester semester = semesterId != null
                                ? semesterService.getSemester(semesterId)
                                : semesterService.getActiveSemesterEntity(school);

                return studentRankingRepository.findAllByClassRoomAndSemesterOrderByGpaDesc(classRoom, semester)
                                .stream()
                                .map(this::mapToRankingDto)
                                .collect(Collectors.toList());
        }

        private StudentRankingDto mapToRankingDto(StudentRanking ranking) {
                return StudentRankingDto.builder()
                                .studentId(ranking.getStudent().getId())
                                .studentCode(ranking.getStudent().getStudentCode())
                                .fullName(ranking.getStudent().getFullName())
                                .gpa(ranking.getGpa() != null ? ranking.getGpa().doubleValue() : null)
                                .performanceCategory(ranking.getPerformanceCategory())
                                .conduct(ranking.getConduct())
                                .rankInClass(ranking.getRankInClass())
                                .build();
        }

        private String classifyPerformance(BigDecimal averageScore) {
                if (averageScore == null)
                        return null;
                double avg = averageScore.doubleValue();
                if (avg >= 8.0)
                        return "Giỏi";
                if (avg >= 6.5)
                        return "Khá";
                if (avg >= 5.0)
                        return "Trung bình";
                if (avg >= 3.5)
                        return "Yếu";
                return "Kém";
        }

        // ==================== ADMIN SUPER EDIT (OVERRIDE) ====================

        /**
         * Get Grade Book for Admin viewing (bypassing teacher assignment check)
         */
        public GradeBookDto getGradeBookByAdmin(School school, UUID classId, UUID subjectId, String semesterId) {
                ClassRoom classRoom = classRoomRepository.findById(classId)
                                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Classroom not found"));
                if (!classRoom.getSchool().getId().equals(school.getId())) {
                        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Lớp học không thuộc trường này");
                }

                Subject subject = subjectRepository.findById(subjectId)
                                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Subject not found"));

                AcademicYear academicYear = classRoom.getAcademicYear();
                Semester semesterEntity = semesterId != null
                                ? semesterService.getSemester(UUID.fromString(semesterId))
                                : semesterService.getActiveSemesterEntity(school);

                int activeSemesterNum = semesterEntity.getSemesterNumber();

                List<ClassEnrollment> enrollments = classEnrollmentRepository.findAllByClassRoomAndAcademicYear(classRoom, academicYear);

                List<Grade> grades = gradeRepository.findAllByClassRoomAndSubjectAndSemester(classRoom, subject, semesterEntity);
                Map<UUID, Grade> gradeByStudent = grades.stream()
                                .collect(Collectors.toMap(grade -> grade.getStudent().getId(), grade -> grade, (gradeA, gradeB) -> gradeA));

                int maxRegularCount = grades.stream()
                                .mapToInt(grade -> grade.getRegularScores() != null ? grade.getRegularScores().size() : 0)
                                .max().orElse(0);
                if (maxRegularCount < 1) maxRegularCount = 1;
                final int regularCount = maxRegularCount;

                List<GradeBookDto.StudentGradeDto> studentDtos = enrollments.stream()
                                .map(enrollment -> {
                                        Student student = enrollment.getStudent();
                                        Grade grade = gradeByStudent.get(student.getId());

                                        List<GradeBookDto.GradeValueDto> gradeValues = new ArrayList<>();
                                        Map<Integer, BigDecimal> regularMap = new HashMap<>();
                                        if (grade != null && grade.getRegularScores() != null) {
                                                for (RegularScore regularScore : grade.getRegularScores()) {
                                                        regularMap.put(regularScore.getScoreIndex(), regularScore.getScoreValue());
                                                }
                                        }
                                        for (int i = 1; i <= regularCount; i++) {
                                                BigDecimal val = regularMap.get(i);
                                                gradeValues.add(GradeBookDto.GradeValueDto.builder()
                                                                .type("REGULAR").index(i)
                                                                .value(val != null ? val.doubleValue() : null).build());
                                        }

                                        gradeValues.add(GradeBookDto.GradeValueDto.builder()
                                                        .type("MIDTERM").index(null)
                                                        .value(grade != null && grade.getMidtermScore() != null ? grade.getMidtermScore().doubleValue() : null).build());

                                        gradeValues.add(GradeBookDto.GradeValueDto.builder()
                                                        .type("FINAL").index(null)
                                                        .value(grade != null && grade.getFinalScore() != null ? grade.getFinalScore().doubleValue() : null).build());

                                        return GradeBookDto.StudentGradeDto.builder()
                                                        .studentId(student.getId().toString())
                                                        .studentCode(student.getStudentCode())
                                                        .fullName(student.getFullName())
                                                        .grades(gradeValues)
                                                        .build();
                                })
                                .sorted((s1, s2) -> StudentSortUtils.vietnameseNameComparator().compare(s1.getFullName(), s2.getFullName()))
                                .toList();

                return GradeBookDto.builder()
                                .subjectId(subjectId.toString())
                                .subjectName(subject.getName())
                                .className(classRoom.getName())
                                .academicYear(academicYear != null ? academicYear.getName() : "")
                                .semester(activeSemesterNum)
                                .regularAssessmentCount(regularCount)
                                .canEdit(true) // Admin can always edit
                                .students(studentDtos)
                                .build();
        }

        /**
         * Save Grades by Admin (Bypassing Locks/Deadlines)
         */
        @Transactional
        public void saveGradesByAdmin(School school, User admin, UUID classId, UUID subjectId, String semesterId, List<GradeBookDto.StudentGradeDto> gradeData, String reason) {
                if (reason == null || reason.trim().isEmpty()) {
                        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Bắt buộc phải nhập lý do khi ghi đè điểm");
                }

                ClassRoom classRoom = classRoomRepository.findById(classId)
                                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Classroom not found"));
                if (!classRoom.getSchool().getId().equals(school.getId())) {
                        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Lớp học không thuộc trường này");
                }

                Subject subject = subjectRepository.findById(subjectId)
                                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Subject not found"));

                Semester semesterEntity = semesterId != null
                                ? semesterService.getSemester(UUID.fromString(semesterId))
                                : semesterService.getActiveSemesterEntity(school);

                // BYPASS validateGradeEntryAllowed() explicitly.

                List<Grade> existingGrades = gradeRepository.findAllByClassRoomAndSubjectAndSemester(classRoom, subject, semesterEntity);
                Map<UUID, Grade> gradeByStudent = existingGrades.stream()
                                .collect(Collectors.toMap(grade -> grade.getStudent().getId(), grade -> grade, (gradeA, gradeB) -> gradeA));

                List<UUID> studentIds = gradeData.stream().map(d -> UUID.fromString(d.getStudentId())).toList();
                Map<UUID, Student> studentMap = studentRepository.findAllById(studentIds).stream()
                                .collect(Collectors.toMap(Student::getId, Function.identity()));

                for (GradeBookDto.StudentGradeDto dto : gradeData) {
                        Student student = studentMap.get(UUID.fromString(dto.getStudentId()));
                        if (student == null) continue;

                        Grade grade = gradeByStudent.getOrDefault(student.getId(), null);
                        boolean isNew = (grade == null);

                        if (isNew) {
                                grade = Grade.builder()
                                                .student(student)
                                                .subject(subject)
                                                .classRoom(classRoom)
                                                .teacher(null) // No specific teacher
                                                .semester(semesterEntity)
                                                .recordedBy(admin)
                                                .recordedAt(Instant.now())
                                                .build();
                                grade = gradeRepository.save(grade);
                        }

                        Map<Integer, BigDecimal> oldRegMap = new HashMap<>();
                        BigDecimal oldMid = null;
                        BigDecimal oldFinal = null;

                        if (!isNew && grade != null) {
                                if (grade.getRegularScores() != null) {
                                        for (RegularScore rs : grade.getRegularScores()) {
                                                oldRegMap.put(rs.getScoreIndex(), rs.getScoreValue());
                                        }
                                }
                                oldMid = grade.getMidtermScore();
                                oldFinal = grade.getFinalScore();
                        }

                        if (grade != null) {
                                grade.getRegularScores().clear();
                                for (GradeBookDto.GradeValueDto gradeValue : dto.getGrades()) {
                                        BigDecimal val = gradeValue.getValue() != null ? BigDecimal.valueOf(gradeValue.getValue()) : null;
                                        switch (gradeValue.getType()) {
                                                case "REGULAR" -> {
                                                        if (gradeValue.getIndex() != null && val != null) {
                                                                grade.getRegularScores().add(RegularScore.builder()
                                                                                .grade(grade).scoreIndex(gradeValue.getIndex()).scoreValue(val).build());
                                                        }
                                                }
                                                case "MIDTERM" -> grade.setMidtermScore(val);
                                                case "FINAL" -> grade.setFinalScore(val);
                                        }
                                }

                                grade.setAverageScore(gradeCalculationHelper.calculateAverage(grade, school.getId()));
                                grade.setUpdatedAt(Instant.now());
                                grade.setUpdatedBy(admin);
                                grade = gradeRepository.save(grade);

                                gradeGovernanceHelper.recordHistoryIfChanged(grade, oldRegMap, oldMid, oldFinal, admin, reason);
                        }
                }
                
                // Auto-calculate rankings
                calculateClassRankings(school, admin, classId, semesterEntity.getId());
        }
}
