package com.schoolmanagement.backend.service;

import com.schoolmanagement.backend.domain.Role;
import com.schoolmanagement.backend.domain.entity.Student;
import com.schoolmanagement.backend.domain.entity.Teacher;
import com.schoolmanagement.backend.domain.entity.User;
import com.schoolmanagement.backend.repo.*;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

/**
 * Shared helper that cleans up all FK-dependent records before a User can be
 * deleted.
 * Used by both SchoolAdminService and SystemAdminService.
 */
@Component
public class UserDeletionHelper {

    private final TeacherRepository teachers;
    private final AttendanceRepository attendances;
    private final TimetableDetailRepository timetableDetails;
    private final TeacherAssignmentRepository teacherAssignments;
    private final ClassRoomRepository classRooms;
    private final DailyClassStatusRepository dailyClassStatuses;
    private final ActivityLogRepository activityLogs;
    private final NotificationRepository notifications;
    private final AuthChallengeRepository authChallenges;
    private final GuardianRepository guardians;
    private final StudentRepository students;
    private final GradeRepository grades;
    private final ClassEnrollmentRepository classEnrollments;
    private final UserRepository users;

    public UserDeletionHelper(TeacherRepository teachers,
            AttendanceRepository attendances,
            TimetableDetailRepository timetableDetails,
            TeacherAssignmentRepository teacherAssignments,
            ClassRoomRepository classRooms,
            DailyClassStatusRepository dailyClassStatuses,
            ActivityLogRepository activityLogs,
            NotificationRepository notifications,
            AuthChallengeRepository authChallenges,
            GuardianRepository guardians,
            StudentRepository students,
            GradeRepository grades,
            ClassEnrollmentRepository classEnrollments,
            UserRepository users) {
        this.teachers = teachers;
        this.attendances = attendances;
        this.timetableDetails = timetableDetails;
        this.teacherAssignments = teacherAssignments;
        this.classRooms = classRooms;
        this.dailyClassStatuses = dailyClassStatuses;
        this.activityLogs = activityLogs;
        this.notifications = notifications;
        this.authChallenges = authChallenges;
        this.guardians = guardians;
        this.students = students;
        this.grades = grades;
        this.classEnrollments = classEnrollments;
        this.users = users;
    }

    /**
     * Remove all dependent records and then delete the User.
     * Must be called within an existing @Transactional context.
     */
    @Transactional
    public void cascadeDeleteUser(User user) {
        Role role = user.getRole();

        // --- Teacher-specific cleanup ---
        if (role == Role.TEACHER) {
            Optional<Teacher> teacherOpt = teachers.findByUserId(user.getId());
            if (teacherOpt.isPresent()) {
                Teacher teacher = teacherOpt.get();
                // 1. Nullify Attendance teacher references (preserve historical records)
                attendances.nullifyTeacherId(teacher.getId());
                // 2. Nullify TimetableDetail teacher references (preserve historical records)
                timetableDetails.nullifyTeacherId(teacher.getId());
                // 3. TeacherAssignment references Teacher
                teacherAssignments.deleteByTeacherId(teacher.getId());
                // 4. Delete the Teacher record itself
                teachers.delete(teacher);
            }
        }

        // --- Student-specific cleanup ---
        if (role == Role.STUDENT) {
            Optional<Student> studentOpt = students.findByUserId(user.getId());
            if (studentOpt.isPresent()) {
                Student student = studentOpt.get();
                // 1. Grades reference Student
                grades.deleteByStudentId(student.getId());
                // 2. Attendance references Student
                attendances.deleteByStudentId(student.getId());
                // 3. ClassEnrollment references Student
                classEnrollments.deleteByStudentId(student.getId());
                // 4. Delete the Student record itself
                students.delete(student);
            }
        }

        // --- Parent-specific cleanup ---
        if (role == Role.GUARDIAN) {
            guardians.deleteByUserId(user.getId());
        }

        // --- Common cleanup (all roles) ---
        // 5. Nullify ClassRoom.homeroomTeacher FK
        classRooms.nullifyHomeroomTeacher(user.getId());
        // 6. Nullify DailyClassStatus.finalizedBy FK
        dailyClassStatuses.nullifyFinalizedBy(user.getId());
        // 7. Nullify ActivityLog.performedBy FK (keep logs, just remove the reference)
        activityLogs.nullifyPerformedBy(user.getId());
        // 8. Delete Notifications created by this user
        notifications.deleteByCreatedById(user.getId());
        // 9. Delete AuthChallenges for this user
        authChallenges.deleteByUserId(user.getId());

        // 10. Finally delete the User
        users.delete(user);
    }
}
