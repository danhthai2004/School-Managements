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
import com.schoolmanagement.backend.repo.timetable.TimetableDetailRepository;

import com.schoolmanagement.backend.domain.entity.student.Student;
import com.schoolmanagement.backend.domain.entity.teacher.Teacher;
import com.schoolmanagement.backend.domain.entity.auth.User;
import com.schoolmanagement.backend.domain.entity.student.Guardian;
import com.schoolmanagement.backend.exception.ApiException;
import org.springframework.http.HttpStatus;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

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
    private final SemesterService semesterService;

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
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "Không thể xóa do học sinh đã có dữ liệu điểm số.");
        }
        if (attendanceRepo.existsByStudent(student)) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "Không thể xóa do học sinh đã có dữ liệu điểm danh.");
        }

        // 3. Cleanup Garbage Data
        // Clean metrics/enrollments (Safe to delete)
        studentRepo.deleteBiometricsByStudentId(studentId);
        enrollmentRepo.deleteAllByStudent(student);

        // Smart Guardian Cleanup (Many-to-One Refactor)
        Guardian guardian = student.getGuardian();
        User guardianUser = null;
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
        User studentUser = student.getUser();

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

    /**
     * Batch delete multiple students in a single transaction.
     * Highly optimized for production latency.
     */
    @Transactional
    public com.schoolmanagement.backend.dto.admin.BulkDeleteResponse deleteBatchStudents(
            com.schoolmanagement.backend.domain.entity.admin.School school,
            List<UUID> ids) {
        log.info("Starting batch deletion for {} students", ids.size());

        // 1. Fetch all students in 1 query
        List<Student> allStudents = studentRepo.findAllById(ids);

        // 2. Filter valid students belonging to the school
        List<Student> schoolStudents = allStudents.stream()
                .filter(s -> s.getSchool().getId().equals(school.getId()))
                .collect(Collectors.toList());

        Set<UUID> foundIds = schoolStudents.stream().map(Student::getId).collect(Collectors.toSet());
        List<String> errors = new ArrayList<>();
        int failed = 0;

        for (UUID id : ids) {
            if (!foundIds.contains(id)) {
                failed++;
                errors.add("Không tìm thấy học sinh ID " + id + " hoặc không thuộc trường.");
            }
        }

        if (foundIds.isEmpty()) {
            return new com.schoolmanagement.backend.dto.admin.BulkDeleteResponse(0, failed, errors);
        }

        // 3. Batch check for integrity constraints (2 SQL queries total)
        Set<UUID> withGrades = studentRepo.findStudentIdsWithGrades(foundIds);
        Set<UUID> withAttendance = studentRepo.findStudentIdsWithAttendance(foundIds);

        List<Student> deletable = new ArrayList<>();
        for (Student s : schoolStudents) {
            if (withGrades.contains(s.getId())) {
                failed++;
                errors.add(s.getFullName() + ": có dữ liệu điểm số");
            } else if (withAttendance.contains(s.getId())) {
                failed++;
                errors.add(s.getFullName() + ": có dữ liệu điểm danh");
            } else {
                deletable.add(s);
            }
        }

        if (deletable.isEmpty()) {
            return new com.schoolmanagement.backend.dto.admin.BulkDeleteResponse(0, failed, errors);
        }

        List<UUID> deletableIds = deletable.stream().map(Student::getId).collect(Collectors.toList());

        // 4. Cleanup Garbage Data in batches (2 SQL queries)
        studentRepo.deleteBiometricsByStudentIds(deletableIds);
        studentRepo.deleteAllByStudentIds(deletableIds); // Enrollments

        // 5. Collect related entities and check orphan guardians BEFORE deleting
        // students
        // (guardian.getStudents() is lazy-loaded and only works while students still
        // exist)
        Set<User> usersToDelete = new HashSet<>();
        Set<Guardian> guardiansToCleanup = new HashSet<>();

        for (Student s : deletable) {
            if (s.getUser() != null) {
                usersToDelete.add(s.getUser());
            }
            if (s.getGuardian() != null) {
                guardiansToCleanup.add(s.getGuardian());
            }
        }

        // 6. Determine orphan guardians BEFORE deleting students (lazy collections
        // still valid)
        Set<UUID> deletableIdSet = new HashSet<>(deletableIds);
        List<Guardian> orphansToRemove = new ArrayList<>();
        for (Guardian g : guardiansToCleanup) {
            boolean hasOtherStudents = g.getStudents().stream()
                    .anyMatch(s -> !deletableIdSet.contains(s.getId()));

            if (!hasOtherStudents) {
                orphansToRemove.add(g);
                if (g.getUser() != null) {
                    usersToDelete.add(g.getUser());
                }
            }
        }

        // 7. Unlink FKs in-memory before batch delete
        for (Student s : deletable) {
            s.setGuardian(null);
            s.setUser(null);
        }

        // 8. Flush unlinks then delete students
        studentRepo.saveAll(deletable); // Persist null FK references
        studentRepo.deleteAllInBatch(deletable);

        // 9. Delete orphan guardians (must happen before user deletion due to FK
        // guardian->user)
        if (!orphansToRemove.isEmpty()) {
            log.info("Deleting {} orphan guardians", orphansToRemove.size());
            for (Guardian g : orphansToRemove) {
                g.setUser(null); // Unlink guardian->user FK
            }
            guardianRepo.saveAll(orphansToRemove);
            guardianRepo.deleteAllInBatch(orphansToRemove);
        }

        // 10. Delete associated user accounts (students + orphan guardians)
        if (!usersToDelete.isEmpty()) {
            log.info("Deleting {} associated user accounts", usersToDelete.size());
            userRepo.deleteAllInBatch(usersToDelete);
        }

        return new com.schoolmanagement.backend.dto.admin.BulkDeleteResponse(deletable.size(), failed, errors);
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
                .orElseThrow(() -> new ApiException(
                        HttpStatus.NOT_FOUND, "Giáo viên không tồn tại: " + teacherId));

        // Validation steps
        validateNoHomeroom(teacher);
        validateNoAssignments(teacher);
        validateNoTimetable(teacher);
        validateNoGrades(teacher);
        validateNoAttendance(teacher);

        // Cleanup and Delete
        User user = teacher.getUser();
        teacherRepo.delete(teacher);

        if (user != null) {
            log.info("Deleting associated user account for teacher: {}", user.getEmail());
            userRepo.delete(user);
        }
    }

    private void validateNoHomeroom(Teacher teacher) {
        if (teacher.getUser() != null) {
            var classRoomOpt = findActiveHomeroom(teacher.getUser());
            if (classRoomOpt.isPresent()) {
                throw new ApiException(
                        HttpStatus.BAD_REQUEST,
                        "Giáo viên " + teacher.getFullName() + " đang chủ nhiệm lớp " + classRoomOpt.get().getName()
                                + ". Vui lòng gỡ bỏ quyền chủ nhiệm trước khi xóa.");
            }
        }
    }

    private void validateNoAssignments(Teacher teacher) {
        if (assignmentRepo.existsByTeacher(teacher)) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "Giáo viên " + teacher.getFullName()
                            + " đang được phân công giảng dạy các môn học. Vui lòng gỡ bỏ phân công trước khi xóa.");
        }
    }

    private void validateNoTimetable(Teacher teacher) {
        if (timetableRepo.existsByTeacher(teacher)) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "Giáo viên " + teacher.getFullName()
                            + " đang có lịch giảng dạy trong thời khóa biểu. Vui lòng cập nhật thời khóa biểu trước khi xóa.");
        }
    }

    private void validateNoGrades(Teacher teacher) {
        if (gradeRepo.existsByTeacher(teacher)) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "Giáo viên " + teacher.getFullName()
                            + " đã ghi nhận điểm cho học sinh. Không thể xóa dữ liệu này để đảm bảo tính toàn vẹn hồ sơ.");
        }
    }

    private void validateNoAttendance(Teacher teacher) {
        if (attendanceRepo.existsByTeacher(teacher)) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "Giáo viên " + teacher.getFullName()
                            + " đã ghi nhận thông tin điểm danh. Không thể xóa dữ liệu này.");
        }
    }

    private Optional<com.schoolmanagement.backend.domain.entity.classes.ClassRoom> findActiveHomeroom(User teacher) {
        if (teacher == null)
            return Optional.empty();

        if (teacher.getSchool() != null) {
            com.schoolmanagement.backend.domain.entity.admin.AcademicYear currentAcademicYear = semesterService
                    .getActiveAcademicYearSafe(teacher.getSchool());
            if (currentAcademicYear != null) {
                Optional<com.schoolmanagement.backend.domain.entity.classes.ClassRoom> found = classRepo
                        .findByHomeroomTeacher_IdAndAcademicYear(teacher.getId(), currentAcademicYear);
                if (found.isPresent())
                    return found;
            }
        }
        return classRepo.findTopByHomeroomTeacher_IdOrderByAcademicYear_StartDateDesc(teacher.getId());
    }
}
