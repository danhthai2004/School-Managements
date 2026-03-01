package com.schoolmanagement.backend.service;

import com.schoolmanagement.backend.domain.entity.ClassRoom;
import com.schoolmanagement.backend.domain.entity.Guardian;
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
    private final TeacherAssignmentRepository assignmentRepo;
    private final TimetableDetailRepository timetableRepo;

    /**
     * Delete a single student in an isolated transaction.
     * If this fails, it won't affect other items in the bulk list.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void deleteSingleStudent(UUID studentId) {
        log.info("Processing isolated deletion for student: {}", studentId);

        Student student = studentRepo.findById(studentId)
                .orElseThrow(() -> new RuntimeException("Student not found: " + studentId));

        // BLOCK if active data exists (Smart Delete)
        // Check by studentId using existing repo methods
        List<com.schoolmanagement.backend.domain.entity.Grade> grades = gradeRepo.findAllByStudentId(studentId);
        if (!grades.isEmpty()) {
            throw new com.schoolmanagement.backend.exception.ApiException(
                    org.springframework.http.HttpStatus.BAD_REQUEST,
                    "Không thể xóa do học sinh đã có dữ liệu điểm số.");
        }

        List<com.schoolmanagement.backend.domain.entity.Attendance> attendances = attendanceRepo.findAllByStudentId(studentId);
        if (!attendances.isEmpty()) {
            throw new com.schoolmanagement.backend.exception.ApiException(
                    org.springframework.http.HttpStatus.BAD_REQUEST,
                    "Không thể xóa do học sinh đã có dữ liệu điểm danh.");
        }

        // Cleanup enrollments (Safe to delete)
        enrollmentRepo.deleteAllByStudent(student);

        // Smart Guardian Cleanup (Guardian has ManyToOne student)
        // Find all guardians linked to this student
        List<Guardian> studentGuardians = guardianRepo.findAllByStudent(student);
        for (Guardian guardian : studentGuardians) {
            com.schoolmanagement.backend.domain.entity.User guardianUser = guardian.getUser();
            guardianRepo.delete(guardian);
            if (guardianUser != null) {
                // Check if another guardian still references this user
                List<Guardian> otherGuardians = guardianRepo.findAllByUserId(guardianUser.getId());
                if (otherGuardians.isEmpty()) {
                    log.info("Deleting orphan guardian user account: {}", guardianUser.getEmail());
                    userRepo.delete(guardianUser);
                }
            }
        }

        // Remove User account for student if exists
        com.schoolmanagement.backend.domain.entity.User studentUser = student.getUser();

        // Delete Student
        studentRepo.delete(student);

        if (studentUser != null) {
            log.info("Deleting associated user account for student: {}", studentUser.getEmail());
            userRepo.delete(studentUser);
        }
    }

    /**
     * Delete a single teacher in an isolated transaction.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void deleteSingleTeacher(UUID teacherId) {
        log.info("Processing isolated deletion for teacher: {}", teacherId);

        Teacher teacher = teacherRepo.findById(teacherId)
                .orElseThrow(() -> new com.schoolmanagement.backend.exception.ApiException(
                        org.springframework.http.HttpStatus.NOT_FOUND, "Giáo viên không tồn tại: " + teacherId));

        // Check Homeroom Logic
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

        // Check Assignments - use count by teacherId instead of existsByTeacher
        long assignmentCount = assignmentRepo.countByTeacherId(teacher.getId());
        if (assignmentCount > 0) {
            throw new com.schoolmanagement.backend.exception.ApiException(
                    org.springframework.http.HttpStatus.BAD_REQUEST,
                    "Giáo viên " + teacher.getFullName()
                            + " đang được phân công giảng dạy các môn học. Vui lòng gỡ bỏ phân công trước khi xóa.");
        }

        // Cleanup and Delete
        // Nullify teacher in attendance and timetable details
        attendanceRepo.nullifyTeacherId(teacher.getId());
        timetableRepo.nullifyTeacherId(teacher.getId());

        // Capture user before deleting teacher
        com.schoolmanagement.backend.domain.entity.User user = teacher.getUser();

        // Delete Teacher
        teacherRepo.delete(teacher);

        // Delete associated User account
        if (user != null) {
            log.info("Deleting associated user account for teacher: {}", user.getEmail());
            userRepo.delete(user);
        }
    }
}
