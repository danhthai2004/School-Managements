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
import com.schoolmanagement.backend.domain.entity.grade.Grade;


import com.schoolmanagement.backend.dto.grade.GradeBookDto;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class GradeService {

        private static final ZoneId VIETNAM_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

        private final GradeRepository gradeRepository;
        private final SubjectRepository subjectRepository;
        private final ClassRoomRepository classRoomRepository;
        private final ClassEnrollmentRepository classEnrollmentRepository;
        private final TeacherAssignmentRepository teacherAssignmentRepository;
        private final TeacherRepository teacherRepository;
        private final UserRepository userRepository;
        private final StudentRepository studentRepository;

        public GradeBookDto getGradeBook(String email, UUID classId, UUID subjectId, Integer semester) {
                User user = userRepository.findByEmailIgnoreCase(email)
                                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

                ClassRoom classRoom = classRoomRepository.findById(classId)
                                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                                                "Classroom not found"));

                Subject subject = subjectRepository.findById(subjectId)
                                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                                                "Subject not found"));

                String academicYear = getCurrentAcademicYear();

                // Check if the current teacher is the one assigned to teach this class-subject
                Teacher teacher = teacherRepository.findByUser(user).orElse(null);
                boolean canEdit = false;
                if (teacher != null) {
                        Optional<TeacherAssignment> assignment = teacherAssignmentRepository
                                        .findByClassRoomAndSubject(classRoom, subject);
                        canEdit = assignment.isPresent() && assignment.get().getTeacher() != null
                                        && assignment.get().getTeacher().getId().equals(teacher.getId());
                }

                // Get all enrolled students
                List<ClassEnrollment> enrollments = classEnrollmentRepository
                                .findAllByClassRoomAndAcademicYear(classRoom, academicYear);

                // Get existing grades (with regularScores eagerly via query)
                List<Grade> grades = gradeRepository
                                .findAllByClassRoomAndSubjectAndSemester(classRoom, subject, semester);
                Map<UUID, Grade> gradeByStudent = grades.stream()
                                .collect(Collectors.toMap(g -> g.getStudent().getId(), g -> g, (a, b) -> a));

                // Determine the maximum number of regular assessment columns
                int maxRegularCount = grades.stream()
                                .mapToInt(g -> g.getRegularScores() != null ? g.getRegularScores().size() : 0)
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
                                                for (RegularScore rs : grade.getRegularScores()) {
                                                        regularMap.put(rs.getScoreIndex(), rs.getScoreValue());
                                                }
                                        }
                                        for (int i = 1; i <= regularCount; i++) {
                                                BigDecimal val = regularMap.get(i);
                                                gradeValues.add(GradeBookDto.GradeValueDto.builder()
                                                                .type("REGULAR").index(i)
                                                                .value(val != null ? val.doubleValue() : null)
                                                                .build());
                                        }

                                        // MID_TERM
                                        gradeValues.add(GradeBookDto.GradeValueDto.builder()
                                                        .type("MID_TERM").index(null)
                                                        .value(grade != null && grade.getMidtermScore() != null
                                                                        ? grade.getMidtermScore().doubleValue()
                                                                        : null)
                                                        .build());

                                        // FINAL_TERM
                                        gradeValues.add(GradeBookDto.GradeValueDto.builder()
                                                        .type("FINAL_TERM").index(null)
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
                                .sorted(Comparator.comparing(GradeBookDto.StudentGradeDto::getFullName))
                                .toList();

                return GradeBookDto.builder()
                                .subjectId(subjectId.toString())
                                .subjectName(subject.getName())
                                .className(classRoom.getName())
                                .academicYear(academicYear)
                                .semester(semester)
                                .regularAssessmentCount(regularCount)
                                .canEdit(canEdit)
                                .students(studentDtos)
                                .build();
        }

        @Transactional
        public void saveGrades(String email, UUID classId, UUID subjectId, Integer semester,
                        List<GradeBookDto.StudentGradeDto> gradeData) {
                User user = userRepository.findByEmailIgnoreCase(email)
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
                                .findByClassRoomAndSubject(classRoom, subject);
                if (assignment.isEmpty() || assignment.get().getTeacher() == null
                                || !assignment.get().getTeacher().getId().equals(teacher.getId())) {
                        throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                                        "Bạn không được phân công dạy lớp này.");
                }

                String academicYear = getCurrentAcademicYear();

                // Get existing grades for update
                List<Grade> existingGrades = gradeRepository
                                .findAllByClassRoomAndSubjectAndSemester(classRoom, subject, semester);
                Map<UUID, Grade> gradeByStudent = existingGrades.stream()
                                .collect(Collectors.toMap(g -> g.getStudent().getId(), g -> g, (a, b) -> a));

                for (GradeBookDto.StudentGradeDto dto : gradeData) {
                        Student student = studentRepository.findById(UUID.fromString(dto.getStudentId()))
                                        .orElse(null);
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
                                                .academicYear(academicYear)
                                                .semester(semester)
                                                .recordedBy(user)
                                                .recordedAt(Instant.now())
                                                .build();
                                grade = gradeRepository.save(grade); // save first to get ID for RegularScore
                        }

                        // Clear existing regular scores and rebuild
                        grade.getRegularScores().clear();

                        for (GradeBookDto.GradeValueDto gv : dto.getGrades()) {
                                BigDecimal val = gv.getValue() != null ? BigDecimal.valueOf(gv.getValue()) : null;
                                switch (gv.getType()) {
                                        case "REGULAR" -> {
                                                if (gv.getIndex() != null && val != null) {
                                                        grade.getRegularScores().add(RegularScore.builder()
                                                                        .grade(grade)
                                                                        .scoreIndex(gv.getIndex())
                                                                        .scoreValue(val)
                                                                        .build());
                                                }
                                        }
                                        case "MID_TERM" -> grade.setMidtermScore(val);
                                        case "FINAL_TERM" -> grade.setFinalScore(val);
                                }
                        }

                        // Calculate average
                        grade.setAverageScore(calculateAverage(grade));
                        grade.setUpdatedAt(Instant.now());
                        grade.setUpdatedBy(user);

                        gradeRepository.save(grade);
                }
        }

        private BigDecimal calculateAverage(Grade g) {
                double total = 0;
                int weight = 0;

                // Regular scores (coefficient 1 each)
                if (g.getRegularScores() != null) {
                        for (RegularScore rs : g.getRegularScores()) {
                                if (rs.getScoreValue() != null) {
                                        total += rs.getScoreValue().doubleValue();
                                        weight += 1;
                                }
                        }
                }

                // Mid-term (coefficient 2)
                if (g.getMidtermScore() != null) {
                        total += g.getMidtermScore().doubleValue() * 2;
                        weight += 2;
                }
                // Final (coefficient 3)
                if (g.getFinalScore() != null) {
                        total += g.getFinalScore().doubleValue() * 3;
                        weight += 3;
                }

                if (weight == 0)
                        return null;
                return BigDecimal.valueOf(Math.round((total / weight) * 10.0) / 10.0);
        }

        private String getCurrentAcademicYear() {
                int year = LocalDate.now(VIETNAM_ZONE).getYear();
                int month = LocalDate.now(VIETNAM_ZONE).getMonthValue();
                return month >= 9 ? year + "-" + (year + 1) : (year - 1) + "-" + year;
        }
}
