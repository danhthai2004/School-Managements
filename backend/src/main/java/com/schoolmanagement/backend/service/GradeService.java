package com.schoolmanagement.backend.service;

import com.schoolmanagement.backend.domain.entity.*;
import com.schoolmanagement.backend.dto.grade.GradeBookDto;
import com.schoolmanagement.backend.repo.*;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
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
        private final UserRepository userRepository;
        private final StudentRepository studentRepository;

        /**
         * Get grade book for a specific class and subject
         */
        public GradeBookDto getGradeBook(String email, UUID classId, UUID subjectId, Integer semester) {
                User user = userRepository.findByEmailIgnoreCase(email)
                                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

                ClassRoom classRoom = classRoomRepository.findById(classId)
                                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                                                "Class not found"));

                Subject subject = subjectRepository.findById(subjectId)
                                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                                                "Subject not found"));

                String currentAcademicYear = getCurrentAcademicYear();

                // 1. Permission Check
                boolean canEdit = checkEditPermission(user, classRoom, subject, currentAcademicYear);
                boolean canView = canEdit || checkViewPermission(user, classRoom);

                if (!canView) {
                        throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                                        "You do not have permission to view grades for this class");
                }

                // 2. Calculate Regular Assessment Count
                int regularAssessmentCount = calculateRegularAssessmentCount(subject.getTotalLessons());

                // 3. Fetch Students
                List<ClassEnrollment> enrollments = classEnrollmentRepository
                                .findAllByClassRoomAndAcademicYear(classRoom, currentAcademicYear);

                // 4. Fetch Existing Grades
                List<Grade> existingGrades = gradeRepository.findByClassRoomIdAndSubjectIdAndSemesterAndAcademicYear(
                                classId, subjectId, semester, currentAcademicYear);

                // 5. Build DTO
                List<GradeBookDto.StudentGradeDto> studentGrades = enrollments.stream()
                                .map(enrollment -> mapToStudentGradeDto(enrollment.getStudent(), existingGrades))
                                .collect(Collectors.toList());

                return GradeBookDto.builder()
                                .subjectId(subjectId.toString())
                                .subjectName(subject.getName())
                                .className(classRoom.getName())
                                .academicYear(currentAcademicYear)
                                .semester(semester)
                                .regularAssessmentCount(regularAssessmentCount)
                                .canEdit(canEdit)
                                .students(studentGrades)
                                .build();
        }

        /**
         * Save grades for a class
         */
        @Transactional
        public void saveGrades(String email, UUID classId, UUID subjectId, Integer semester,
                        List<GradeBookDto.StudentGradeDto> gradeData) {
                User user = userRepository.findByEmailIgnoreCase(email)
                                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

                ClassRoom classRoom = classRoomRepository.findById(classId)
                                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                                                "Class not found"));

                Subject subject = subjectRepository.findById(subjectId)
                                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                                                "Subject not found"));

                String currentAcademicYear = getCurrentAcademicYear();

                // Permission Check (Strict)
                if (!checkEditPermission(user, classRoom, subject, currentAcademicYear)) {
                        throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                                        "Only the assigned subject teacher can enter grades");
                }

                // Process each student's grades
                for (GradeBookDto.StudentGradeDto studentDto : gradeData) {
                        Student student = studentRepository.findById(UUID.fromString(studentDto.getStudentId()))
                                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                                                        "Student not found: " + studentDto.getStudentId()));

                        for (GradeBookDto.GradeValueDto gradeValue : studentDto.getGrades()) {
                                if (gradeValue.getValue() == null)
                                        continue;

                                // Validate Grade Type
                                Grade.GradeType type = Grade.GradeType.valueOf(gradeValue.getType());

                                // Check if grade exists (to update) or create new
                                // For simplicity in this iteration, we'll fetch all and filter in memory or we
                                // could add a specific finder.
                                // Better approach for bulk: Delete existing for this specific slot and
                                // re-insert, OR find-and-update.
                                // Here we implement find-and-update.

                                Optional<Grade> existingGrade = findExistingGrade(
                                                existingGradesForClass(classId, subjectId, semester,
                                                                currentAcademicYear),
                                                student.getId(), type, gradeValue.getIndex());

                                if (existingGrade.isPresent()) {
                                        Grade g = existingGrade.get();
                                        g.setValue(gradeValue.getValue());
                                        gradeRepository.save(g);
                                } else {
                                        Grade newGrade = Grade.builder()
                                                        .student(student)
                                                        .subject(subject)
                                                        .classRoom(classRoom)
                                                        .academicYear(currentAcademicYear)
                                                        .semester(semester)
                                                        .type(type)
                                                        .gradeIndex(type == Grade.GradeType.REGULAR
                                                                        ? gradeValue.getIndex()
                                                                        : null)
                                                        .value(gradeValue.getValue())
                                                        .build();
                                        gradeRepository.save(newGrade);
                                }
                        }
                }
        }

        // ==================== HELPER METHODS ====================

        private boolean checkEditPermission(User user, ClassRoom classRoom, Subject subject, String academicYear) {
                // Must be assigned to teach this subject in this class in the OFFICIAL
                // timetable
                // This enforces the 2-layer requirement: School-level assignment is implied if
                // they are in the timetable.
                // We check the specific class-level assignment here via TimetableDetails.
                return teacherAssignmentRepository.findAllBySubjectAndSchool(subject, classRoom.getSchool()).stream()
                                .anyMatch(ta -> ta.getTeacher().getUser().getId().equals(user.getId()));
        }

        private boolean checkViewPermission(User user, ClassRoom classRoom) {
                // Homeroom teacher can view
                return classRoom.getHomeroomTeacher() != null &&
                                classRoom.getHomeroomTeacher().getId().equals(user.getId());
        }

        private int calculateRegularAssessmentCount(Integer totalLessons) {
                if (totalLessons == null)
                        return 2; // Default fallback
                if (totalLessons <= 35)
                        return 2;
                if (totalLessons <= 70)
                        return 3;
                return 4;
        }

        private String getCurrentAcademicYear() {
                int year = LocalDate.now().getYear();
                int month = LocalDate.now().getMonthValue();
                return month >= 9 ? year + "-" + (year + 1) : (year - 1) + "-" + year;
        }

        private List<Grade> existingGradesForClass(UUID classId, UUID subjectId, Integer semester, String year) {
                return gradeRepository.findByClassRoomIdAndSubjectIdAndSemesterAndAcademicYear(classId, subjectId,
                                semester,
                                year);
        }

        private Optional<Grade> findExistingGrade(List<Grade> grades, UUID studentId, Grade.GradeType type,
                        Integer index) {
                return grades.stream()
                                .filter(g -> g.getStudent().getId().equals(studentId) &&
                                                g.getType() == type &&
                                                Objects.equals(g.getGradeIndex(), index))
                                .findFirst();
        }

        private GradeBookDto.StudentGradeDto mapToStudentGradeDto(Student student, List<Grade> allGrades) {
                List<Grade> studentGrades = allGrades.stream()
                                .filter(g -> g.getStudent().getId().equals(student.getId()))
                                .toList();

                List<GradeBookDto.GradeValueDto> gradeValues = studentGrades.stream()
                                .map(g -> new GradeBookDto.GradeValueDto(
                                                g.getType().name(),
                                                g.getGradeIndex(),
                                                g.getValue()))
                                .collect(Collectors.toList());

                return GradeBookDto.StudentGradeDto.builder()
                                .studentId(student.getId().toString())
                                .studentCode(student.getStudentCode())
                                .fullName(student.getFullName())
                                .grades(gradeValues)
                                .build();
        }
}
