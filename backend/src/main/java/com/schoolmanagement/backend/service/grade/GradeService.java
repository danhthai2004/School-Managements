package com.schoolmanagement.backend.service.grade;

import com.schoolmanagement.backend.domain.entity.auth.User;
import com.schoolmanagement.backend.domain.entity.classes.ClassRoom;
import com.schoolmanagement.backend.domain.entity.classes.Subject;
import com.schoolmanagement.backend.domain.entity.teacher.Teacher;
import com.schoolmanagement.backend.domain.entity.teacher.TeacherAssignment;
import com.schoolmanagement.backend.domain.entity.classes.ClassEnrollment;
import com.schoolmanagement.backend.domain.entity.student.Student;
import com.schoolmanagement.backend.domain.entity.grade.RegularScore;

import com.schoolmanagement.backend.repo.grade.GradeRepository;
import com.schoolmanagement.backend.repo.classes.SubjectRepository;
import com.schoolmanagement.backend.repo.classes.ClassRoomRepository;
import com.schoolmanagement.backend.repo.classes.ClassEnrollmentRepository;
import com.schoolmanagement.backend.repo.teacher.TeacherAssignmentRepository;
import com.schoolmanagement.backend.repo.teacher.TeacherRepository;
import com.schoolmanagement.backend.repo.auth.UserRepository;
import com.schoolmanagement.backend.repo.student.StudentRepository;
import com.schoolmanagement.backend.service.admin.SemesterService;
import com.schoolmanagement.backend.domain.entity.grade.Grade;
import com.schoolmanagement.backend.domain.entity.admin.Semester;
import com.schoolmanagement.backend.domain.entity.admin.AcademicYear;
import java.util.function.Function;
import com.schoolmanagement.backend.util.StudentSortUtils;

import com.schoolmanagement.backend.dto.grade.GradeBookDto;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.Instant;

import java.util.*;
import java.util.stream.Collectors;
import org.springframework.context.ApplicationContext;

@Service
@RequiredArgsConstructor
@Slf4j
@org.springframework.transaction.annotation.Transactional(readOnly = true)
public class GradeService {

        private final GradeRepository gradeRepository;
        private final SubjectRepository subjectRepository;
        private final ClassRoomRepository classRoomRepository;
        private final ClassEnrollmentRepository classEnrollmentRepository;
        private final TeacherAssignmentRepository teacherAssignmentRepository;
        private final TeacherRepository teacherRepository;
        private final UserRepository userRepository;
        private final StudentRepository studentRepository;
        private final SemesterService semesterService;
        private final GradeCalculationHelper gradeCalculationHelper;
        private final GradeGovernanceHelper gradeGovernanceHelper;
        private final ApplicationContext applicationContext;

        public GradeBookDto getGradeBook(String email, UUID classId, UUID subjectId, String semesterId) {
                User user = userRepository.findByEmailIgnoreCaseWithSchool(email)
                                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

                ClassRoom classRoom = classRoomRepository.findById(classId)
                                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                                                "Classroom not found"));

                Subject subject = subjectRepository.findById(subjectId)
                                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                                                "Subject not found"));

                AcademicYear academicYear = classRoom.getAcademicYear();

                // Use target semester ID or fallback to active semester
                Semester semesterEntity = semesterId != null
                                ? semesterService.getSemester(UUID.fromString(semesterId))
                                : semesterService.getActiveSemesterEntity(user.getSchool());

                int activeSemesterNum = semesterEntity.getSemesterNumber();

                // Check if the current teacher is the one assigned to teach this class-subject
                Teacher teacher = teacherRepository.findByUser(user).orElse(null);
                boolean canEdit = false;
                if (teacher != null) {
                        Optional<TeacherAssignment> assignment = teacherAssignmentRepository
                                        .findFirstByClassRoomAndSubject(classRoom, subject);
                        canEdit = assignment.isPresent() && assignment.get().getTeacher() != null
                                        && assignment.get().getTeacher().getId().equals(teacher.getId());
                }

                // Get all enrolled students
                List<ClassEnrollment> enrollments = classEnrollmentRepository
                                .findAllByClassRoomAndAcademicYear(classRoom, academicYear);

                // Get existing grades using Semester entity FK
                List<Grade> grades = gradeRepository.findAllByClassRoomAndSubjectAndSemester(classRoom, subject,
                                semesterEntity);
                Map<UUID, Grade> gradeByStudent = grades.stream()
                                .collect(Collectors.toMap(grade -> grade.getStudent().getId(), grade -> grade,
                                                (gradeA, gradeB) -> gradeA));

                // Determine the maximum number of regular assessment columns
                int maxRegularCount = grades.stream()
                                .mapToInt(grade -> grade.getRegularScores() != null ? grade.getRegularScores().size()
                                                : 0)
                                .max().orElse(0);
                // Minimum 1 column when there's no data yet
                if (maxRegularCount < 1)
                        maxRegularCount = 1;

                final int regularCount = maxRegularCount;

                // Map students to DTOs
                List<GradeBookDto.StudentGradeDto> studentDtos = enrollments.stream()
                                .map(enrollment -> {
                                        Student student = enrollment.getStudent();
                                        Grade grade = gradeByStudent.get(student.getId());

                                        List<GradeBookDto.GradeValueDto> gradeValues = new ArrayList<>();

                                        // Dynamic REGULAR scores
                                        Map<Integer, BigDecimal> regularMap = new HashMap<>();
                                        if (grade != null && grade.getRegularScores() != null) {
                                                for (RegularScore regularScore : grade.getRegularScores()) {
                                                        regularMap.put(regularScore.getScoreIndex(),
                                                                        regularScore.getScoreValue());
                                                }
                                        }
                                        for (int i = 1; i <= regularCount; i++) {
                                                BigDecimal val = regularMap.get(i);
                                                gradeValues.add(GradeBookDto.GradeValueDto.builder()
                                                                .type("REGULAR").index(i)
                                                                .value(val != null ? val.doubleValue() : null)
                                                                .build());
                                        }

                                        // MIDTERM
                                        gradeValues.add(GradeBookDto.GradeValueDto.builder()
                                                        .type("MIDTERM").index(null)
                                                        .value(grade != null && grade.getMidtermScore() != null
                                                                        ? grade.getMidtermScore().doubleValue()
                                                                        : null)
                                                        .build());

                                        // FINAL
                                        gradeValues.add(GradeBookDto.GradeValueDto.builder()
                                                        .type("FINAL").index(null)
                                                        .value(grade != null && grade.getFinalScore() != null
                                                                        ? grade.getFinalScore().doubleValue()
                                                                        : null)
                                                        .build());

                                        return GradeBookDto.StudentGradeDto.builder()
                                                        .studentId(student.getId().toString())
                                                        .studentCode(student.getStudentCode())
                                                        .fullName(student.getFullName())
                                                        .grades(gradeValues)
                                                        .build();
                                })
                                .sorted((s1, s2) -> StudentSortUtils.vietnameseNameComparator()
                                                .compare(s1.getFullName(), s2.getFullName()))
                                .toList();

                return GradeBookDto.builder()
                                .subjectId(subjectId.toString())
                                .subjectName(subject.getName())
                                .className(classRoom.getName())
                                .academicYear(academicYear != null ? academicYear.getName() : "")
                                .semester(activeSemesterNum)
                                .regularAssessmentCount(regularCount)
                                .canEdit(canEdit)
                                .students(studentDtos)
                                .build();
        }

        @org.springframework.transaction.annotation.Transactional
        public void saveGrades(String email, UUID classId, UUID subjectId, String semesterId,
                        List<GradeBookDto.StudentGradeDto> gradeData) {
                User user = userRepository.findByEmailIgnoreCaseWithSchool(email)
                                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

                Teacher teacher = teacherRepository.findByUser(user)
                                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                                                "Teacher profile not found"));

                ClassRoom classRoom = classRoomRepository.findById(classId)
                                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                                                "Classroom not found"));

                Subject subject = subjectRepository.findById(subjectId)
                                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                                                "Subject not found"));

                // Verify teacher is assigned
                Optional<TeacherAssignment> assignment = teacherAssignmentRepository
                                .findFirstByClassRoomAndSubject(classRoom, subject);
                if (assignment.isEmpty() || assignment.get().getTeacher() == null
                                || !assignment.get().getTeacher().getId().equals(teacher.getId())) {
                        throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                                        "Bạn không được phân công dạy lớp này.");
                }

                // Use target semester ID or fallback to active semester
                Semester semesterEntity = semesterId != null
                                ? semesterService.getSemester(UUID.fromString(semesterId))
                                : semesterService.getActiveSemesterEntity(user.getSchool());

                if (semesterEntity.getStatus() == com.schoolmanagement.backend.domain.admin.SemesterStatus.CLOSED) {
                        throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                                        String.format("%s (năm học %s) đã chốt sổ. Bạn không thể nhập hoặc sửa đổi điểm cho học kỳ này.",
                                                        semesterEntity.getName(),
                                                        semesterEntity.getAcademicYear().getName()));
                }

                if (semesterEntity.getStatus() == com.schoolmanagement.backend.domain.admin.SemesterStatus.UPCOMING) {
                        throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                                        String.format("%s (năm học %s) chưa bắt đầu. Bạn chưa thể nhập điểm cho học kỳ này.",
                                                        semesterEntity.getName(),
                                                        semesterEntity.getAcademicYear().getName()));
                }

                // Check per-class lock (Admin-level grade entry lock) and deadline
                gradeGovernanceHelper.validateGradeEntryAllowed(classId, semesterEntity);

                // Get existing grades using Semester entity FK
                List<Grade> existingGrades = gradeRepository.findAllByClassRoomAndSubjectAndSemester(classRoom, subject,
                                semesterEntity);
                Map<UUID, Grade> gradeByStudent = existingGrades.stream()
                                .collect(Collectors.toMap(grade -> grade.getStudent().getId(), grade -> grade,
                                                (gradeA, gradeB) -> gradeA));

                // Bulk fetch students
                List<UUID> studentIds = gradeData.stream()
                                .map(d -> UUID.fromString(d.getStudentId()))
                                .toList();
                Map<UUID, Student> studentMap = studentRepository.findAllById(studentIds).stream()
                                .collect(Collectors.toMap(Student::getId, Function.identity()));

                for (GradeBookDto.StudentGradeDto dto : gradeData) {
                        Student student = studentMap.get(UUID.fromString(dto.getStudentId()));
                        if (student == null)
                                continue;

                        Grade grade = gradeByStudent.getOrDefault(student.getId(), null);
                        boolean isNew = (grade == null);

                        if (isNew) {
                                grade = Grade.builder()
                                                .student(student)
                                                .subject(subject)
                                                .classRoom(classRoom)
                                                .teacher(teacher)
                                                .semester(semesterEntity)
                                                .recordedBy(user)
                                                .recordedAt(Instant.now())
                                                .build();
                                grade = gradeRepository.save(grade); // save first to get ID for RegularScore
                        }

                        // Snapshot old scores for audit trail
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

                        // Clear existing regular scores and rebuild
                        if (grade != null) {
                                grade.getRegularScores().clear();

                                for (GradeBookDto.GradeValueDto gradeValue : dto.getGrades()) {
                                        BigDecimal val = gradeValue.getValue() != null
                                                        ? BigDecimal.valueOf(gradeValue.getValue())
                                                        : null;
                                        switch (gradeValue.getType()) {
                                                case "REGULAR" -> {
                                                        if (gradeValue.getIndex() != null && val != null) {
                                                                grade.getRegularScores().add(RegularScore.builder()
                                                                                .grade(grade)
                                                                                .scoreIndex(gradeValue.getIndex())
                                                                                .scoreValue(val)
                                                                                .build());
                                                        }
                                                }
                                                case "MIDTERM" -> grade.setMidtermScore(val);
                                                case "FINAL" -> grade.setFinalScore(val);
                                        }
                                }

                                // Calculate average using shared helper (reads weights from DB)
                                UUID schoolId = classRoom.getSchool().getId();
                                grade.setAverageScore(gradeCalculationHelper.calculateAverage(grade, schoolId));
                                grade.setUpdatedAt(Instant.now());
                                grade.setUpdatedBy(user);
                                grade = gradeRepository.save(grade);

                                // Record history if changed
                                gradeGovernanceHelper.recordHistoryIfChanged(grade, oldRegMap, oldMid, oldFinal, user, "Cập nhật qua tính năng Nhập điểm");
                        }
                }

                // Auto-calculate rankings
                applicationContext.getBean(AdminGradeService.class).calculateClassRankings(user.getSchool(), user, classId, semesterEntity.getId());
        }

}
