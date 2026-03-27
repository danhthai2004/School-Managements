package com.schoolmanagement.backend.service.admin;

import com.schoolmanagement.backend.repo.student.StudentRepository;
import com.schoolmanagement.backend.repo.teacher.TeacherRepository;
import com.schoolmanagement.backend.repo.classes.ClassRoomRepository;
import com.schoolmanagement.backend.repo.classes.ClassEnrollmentRepository;
import com.schoolmanagement.backend.repo.grade.GradeRepository;
import com.schoolmanagement.backend.repo.attendance.AttendanceRepository;
import com.schoolmanagement.backend.repo.student.GuardianRepository;
import com.schoolmanagement.backend.repo.auth.UserRepository;
import com.schoolmanagement.backend.repo.teacher.TeacherAssignmentRepository;
import com.schoolmanagement.backend.repo.teacher.ExamInvigilatorRepository;
import com.schoolmanagement.backend.repo.timetable.TimetableDetailRepository;

import com.schoolmanagement.backend.domain.entity.classes.ClassEnrollment;
import com.schoolmanagement.backend.domain.entity.classes.ClassRoom;
import com.schoolmanagement.backend.domain.entity.student.Student;
import com.schoolmanagement.backend.domain.entity.teacher.Teacher;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class BulkDeleteHelperService {

    private final StudentRepository studentRepo;
    private final TeacherRepository teacherRepo;
    private final ClassRoomRepository classRepo;
    private final ClassEnrollmentRepository enrollmentRepo;
    private final GradeRepository gradeRepo;
    private final AttendanceRepository attendanceRepo;
    private final GuardianRepository guardianRepo;
    private final UserRepository userRepo;
    private final ExamInvigilatorRepository examInvigilatorRepo;

    // Additional Repos for cleanup if not covered by main repo methods
    // In this plan, we put JPQL in main repos, so we trigger them here.

    /**
     * Delete a single student in an isolated transaction.
     * If this fails, it won't affect other items in the bulk list.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void deleteSingleStudent(UUID studentId) {
        log.info("Processing isolated deletion for student: {}", studentId);

        // 1. Check existence
        Student student = studentRepo.findById(studentId)
                .orElseThrow(() -> new RuntimeException("Student not found: " + studentId));

        // 2. BLOCK if active data exists (Smart Delete)
        if (gradeRepo.existsByStudent(student)) {
            throw new com.schoolmanagement.backend.exception.ApiException(
                    org.springframework.http.HttpStatus.BAD_REQUEST,
                    "Không thể xóa do học sinh đã có dữ liệu điểm số.");
        }
        if (attendanceRepo.existsByStudent(student)) {
            throw new com.schoolmanagement.backend.exception.ApiException(
                    org.springframework.http.HttpStatus.BAD_REQUEST,
                    "Không thể xóa do học sinh đã có dữ liệu điểm danh.");
        }

        // 3. Cleanup Garbage Data
        // Clean metrics/enrollments (Safe to delete)
        studentRepo.deleteBiometricsByStudentId(studentId);
        enrollmentRepo.deleteAllByStudent(student);

        // Smart Guardian Cleanup (Many-to-One Refactor)
        com.schoolmanagement.backend.domain.entity.student.Guardian guardian = student.getGuardian();
        com.schoolmanagement.backend.domain.entity.auth.User guardianUser = null;
        boolean shouldDeleteGuardian = false;

        if (guardian != null) {
            // Check if this is the last student for this guardian
            // We use the students list from guardian (lazy loaded, but transaction is open)
            // Or careful: if we haven't fetched it, it might trigger query.
            // Filter out the student we are about to delete (just in case it's still in
            // list)
            long otherStudentsCount = guardian.getStudents().stream()
                    .filter(s -> !s.getId().equals(studentId))
                    .count();

            if (otherStudentsCount == 0) {
                shouldDeleteGuardian = true;
                guardianUser = guardian.getUser();
            }
        }

        // Remove User account for student if exists
        com.schoolmanagement.backend.domain.entity.auth.User studentUser = student.getUser();

        // 4. Delete Student
        student.setGuardian(null); // Unlink first
        studentRepo.delete(student);

        if (studentUser != null) {
            log.info("Deleting associated user account for student: {}", studentUser.getEmail());
            userRepo.delete(studentUser);
        }

        // 5. Delete Guardian if "Smart Delete" triggered
        if (shouldDeleteGuardian && guardian != null) {
            log.info("Deleting orphan guardian and account: {}", guardian.getFullName());
            guardianRepo.delete(guardian);

            if (guardianUser != null) {
                log.info("Deleting associated user account for guardian: {}", guardianUser.getEmail());
                userRepo.delete(guardianUser);
            }
        }
    }

    // Inject Repos needed for checks
    private final TeacherAssignmentRepository assignmentRepo;
    private final TimetableDetailRepository timetableRepo;

    /**
     * Delete a single teacher in an isolated transaction.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void deleteSingleTeacher(UUID teacherId) {
        log.info("Processing isolated deletion for teacher: {}", teacherId);

        Teacher teacher = teacherRepo.findById(teacherId)
                .orElseThrow(() -> new com.schoolmanagement.backend.exception.ApiException(
                        org.springframework.http.HttpStatus.NOT_FOUND, "Giáo viên không tồn tại: " + teacherId));

        // Validation steps
        validateNoHomeroom(teacher);
        validateNoAssignments(teacher);
        validateNoTimetable(teacher);
        validateNoGrades(teacher);
        validateNoAttendance(teacher);
        validateNoExamInvigilation(teacher);

        // Cleanup and Delete
        com.schoolmanagement.backend.domain.entity.auth.User user = teacher.getUser();
        teacherRepo.delete(teacher);

        if (user != null) {
            log.info("Deleting associated user account for teacher: {}", user.getEmail());
            userRepo.delete(user);
        }
    }

    private void validateNoHomeroom(Teacher teacher) {
        if (teacher.getUser() != null) {
            var classRoomOpt = classRepo.findByHomeroomTeacher(teacher.getUser());
            if (classRoomOpt.isPresent()) {
                throw new com.schoolmanagement.backend.exception.ApiException(
                        org.springframework.http.HttpStatus.BAD_REQUEST,
                        "Giáo viên " + teacher.getFullName() + " đang chủ nhiệm lớp " + classRoomOpt.get().getName()
                                + ". Vui lòng gỡ bỏ quyền chủ nhiệm trước khi xóa.");
            }
        }
    }

    private void validateNoAssignments(Teacher teacher) {
        if (assignmentRepo.existsByTeacher(teacher)) {
            throw new com.schoolmanagement.backend.exception.ApiException(
                    org.springframework.http.HttpStatus.BAD_REQUEST,
                    "Giáo viên " + teacher.getFullName()
                            + " đang được phân công giảng dạy các môn học. Vui lòng gỡ bỏ phân công trước khi xóa.");
        }
    }

    private void validateNoTimetable(Teacher teacher) {
        if (timetableRepo.existsByTeacher(teacher)) {
            throw new com.schoolmanagement.backend.exception.ApiException(
                    org.springframework.http.HttpStatus.BAD_REQUEST,
                    "Giáo viên " + teacher.getFullName()
                            + " đang có lịch giảng dạy trong thời khóa biểu. Vui lòng cập nhật thời khóa biểu trước khi xóa.");
        }
    }

    private void validateNoGrades(Teacher teacher) {
        if (gradeRepo.existsByTeacher(teacher)) {
            throw new com.schoolmanagement.backend.exception.ApiException(
                    org.springframework.http.HttpStatus.BAD_REQUEST,
                    "Giáo viên " + teacher.getFullName()
                            + " đã ghi nhận điểm cho học sinh. Không thể xóa dữ liệu này để đảm bảo tính toàn vẹn hồ sơ.");
        }
    }

    private void validateNoAttendance(Teacher teacher) {
        if (attendanceRepo.existsByTeacher(teacher)) {
            throw new com.schoolmanagement.backend.exception.ApiException(
                    org.springframework.http.HttpStatus.BAD_REQUEST,
                    "Giáo viên " + teacher.getFullName()
                            + " đã ghi nhận thông tin điểm danh. Không thể xóa dữ liệu này.");
        }
    }

    private void validateNoExamInvigilation(Teacher teacher) {
        if (examInvigilatorRepo.existsByTeacher(teacher)) {
            throw new com.schoolmanagement.backend.exception.ApiException(
                    org.springframework.http.HttpStatus.BAD_REQUEST,
                    "Giáo viên " + teacher.getFullName()
                            + " đang được phân công giám thị trong các kỳ thi. Vui lòng gỡ bỏ phân công trước khi xóa.");
        }
    }
}
