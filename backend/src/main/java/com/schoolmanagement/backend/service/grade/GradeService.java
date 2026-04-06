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
import com.schoolmanagement.backend.repo.admin.SemesterRepository;

import com.schoolmanagement.backend.dto.grade.GradeBookDto;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.Instant;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
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
        private final SemesterRepository semesterRepository;

        public GradeBookDto getGradeBook(String email, UUID classId, UUID subjectId, String semesterId) {
                User user = userRepository.findByEmailIgnoreCase(email)
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
                                        .findByClassRoomAndSubject(classRoom, subject);
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
                                .academicYear(academicYear != null ? academicYear.getName() : "")
                                .semester(activeSemesterNum)
                                .regularAssessmentCount(regularCount)
                                .canEdit(canEdit)
                                .students(studentDtos)
                                .build();
        }

        @Transactional
        public void saveGrades(String email, UUID classId, UUID subjectId, String semesterId,
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

                AcademicYear academicYear = classRoom.getAcademicYear();

                // Use target semester ID or fallback to active semester
                Semester semesterEntity = semesterId != null
                                ? semesterService.getSemester(UUID.fromString(semesterId))
                                : semesterService.getActiveSemesterEntity(user.getSchool());

                int activeSemesterNum = semesterEntity.getSemesterNumber();

                if (semesterEntity.getStatus() == com.schoolmanagement.backend.domain.admin.SemesterStatus.CLOSED) {
                        throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                                        "Học kỳ đã chốt sổ, không thể sửa đổi điểm.");
                }

                if (semesterEntity.getStatus() == com.schoolmanagement.backend.domain.admin.SemesterStatus.UPCOMING) {
                        throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                                        "Học kỳ chưa bắt đầu, không thể nhập điểm.");
                }

                // Get existing grades using Semester entity FK
                List<Grade> existingGrades = gradeRepository.findAllByClassRoomAndSubjectAndSemester(classRoom, subject,
                                semesterEntity);
                Map<UUID, Grade> gradeByStudent = existingGrades.stream()
                                .collect(Collectors.toMap(grade -> grade.getStudent().getId(), grade -> grade,
                                                (gradeA, gradeB) -> gradeA));

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
                                                .semester(semesterEntity)
                                                .recordedBy(user)
                                                .recordedAt(Instant.now())
                                                .build();
                                grade = gradeRepository.save(grade); // save first to get ID for RegularScore
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
        }

        private BigDecimal calculateAverage(Grade grade) {
                double total = 0;
                int weight = 0;

                // Regular scores (coefficient 1 each)
                if (grade.getRegularScores() != null) {
                        for (RegularScore regularScore : grade.getRegularScores()) {
                                if (regularScore.getScoreValue() != null) {
                                        total += regularScore.getScoreValue().doubleValue();
                                        weight += 1;
                                }
                        }
                }

                // Mid-term (coefficient 2)
                if (grade.getMidtermScore() != null) {
                        total += grade.getMidtermScore().doubleValue() * 2;
                        weight += 2;
                }
                // Final (coefficient 3)
                if (grade.getFinalScore() != null) {
                        total += grade.getFinalScore().doubleValue() * 3;
                        weight += 3;
                }

                if (weight == 0)
                        return null;
                return BigDecimal.valueOf(Math.round((total / weight) * 10.0) / 10.0);
        }

        // getCurrentAcademicYear() removed — now using
        // SemesterService.getActiveAcademicYearName()
}
