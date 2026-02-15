package com.schoolmanagement.backend.service;

import com.schoolmanagement.backend.domain.entity.ClassEnrollment;
import com.schoolmanagement.backend.domain.entity.ClassRoom;
import com.schoolmanagement.backend.domain.entity.Student;
import com.schoolmanagement.backend.domain.entity.Teacher;
import com.schoolmanagement.backend.repo.*;
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
        com.schoolmanagement.backend.domain.entity.Guardian guardian = student.getGuardian();
        com.schoolmanagement.backend.domain.entity.User guardianUser = null;
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
        com.schoolmanagement.backend.domain.entity.User studentUser = student.getUser();

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

        // 1. Check Homeroom Logic
        // Find if teacher is homeroom for any class
        if (teacher.getUser() != null) {
            var classRoomOpt = classRepo.findByHomeroomTeacher(teacher.getUser());
            if (classRoomOpt.isPresent()) {
                ClassRoom classRoom = classRoomOpt.get();
                throw new com.schoolmanagement.backend.exception.ApiException(
                        org.springframework.http.HttpStatus.BAD_REQUEST,
                        "Giáo viên " + teacher.getFullName() + " đang chủ nhiệm lớp " + classRoom.getName()
                                + ". Vui lòng gỡ bỏ quyền chủ nhiệm trước khi xóa.");
            }
        }

        // 2. Check Assignments
        if (assignmentRepo.existsByTeacher(teacher)) {
            throw new com.schoolmanagement.backend.exception.ApiException(
                    org.springframework.http.HttpStatus.BAD_REQUEST,
                    "Giáo viên " + teacher.getFullName()
                            + " đang được phân công giảng dạy các môn học. Vui lòng gỡ bỏ phân công trước khi xóa.");
        }

        // 3. Check Timetable
        if (timetableRepo.existsByTeacher(teacher)) {
            throw new com.schoolmanagement.backend.exception.ApiException(
                    org.springframework.http.HttpStatus.BAD_REQUEST,
                    "Giáo viên " + teacher.getFullName()
                            + " đang có lịch giảng dạy trong thời khóa biểu. Vui lòng cập nhật thời khóa biểu trước khi xóa.");
        }

        // 4. Cleanup and Delete (If passed all checks)

        // Capture user before deleting teacher
        com.schoolmanagement.backend.domain.entity.User user = teacher.getUser();

        // Delete Teacher
        teacherRepo.delete(teacher);

        // 5. Delete associated User account
        if (user != null) {
            log.info("Deleting associated user account for teacher: {}", user.getEmail());
            userRepo.delete(user);
        }
    }
}
