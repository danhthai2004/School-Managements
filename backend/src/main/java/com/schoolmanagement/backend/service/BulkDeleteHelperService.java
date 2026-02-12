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

        // 2. Cleanup related data (JPQL for performance)
        studentRepo.deleteAttendanceByStudentId(studentId);
        studentRepo.deleteGradesByStudentId(studentId);
        studentRepo.deleteBiometricsByStudentId(studentId);
        studentRepo.deleteGuardiansByStudentId(studentId);
        enrollmentRepo.deleteAllByStudent(student);

        // 3. Delete Student
        studentRepo.delete(student);
    }

    /**
     * Delete a single teacher in an isolated transaction.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void deleteSingleTeacher(UUID teacherId) {
        log.info("Processing isolated deletion for teacher: {}", teacherId);

        Teacher teacher = teacherRepo.findById(teacherId)
                .orElseThrow(() -> new RuntimeException("Teacher not found: " + teacherId));

        // 1. Check Homeroom Logic
        // Find if teacher is homeroom for any class
        var classRoomOpt = classRepo.findByHomeroomTeacher(teacher.getUser());
        if (classRoomOpt.isPresent()) {
            ClassRoom classRoom = classRoomOpt.get();
            long studentCount = enrollmentRepo.countByClassRoom(classRoom);

            if (studentCount > 0) {
                throw new RuntimeException("Giáo viên đang chủ nhiệm lớp " + classRoom.getName() + " có " + studentCount
                        + " học sinh. Không thể xóa.");
            } else {
                // Empty class -> Unassign teacher
                log.info("Teacher is homeroom of empty class {}. Unassigning...", classRoom.getName());
                classRoom.setHomeroomTeacher(null);
                classRepo.save(classRoom);
            }
        }

        // 2. Cleanup related data
        teacherRepo.removeTeacherFromTimetable(teacherId); // Set teacher = NULL
        teacherRepo.removeTeacherAssignments(teacherId); // Delete rows

        // 3. Delete Teacher
        teacherRepo.delete(teacher);
    }
}
