package com.schoolmanagement.backend.repo.attendance;

import com.schoolmanagement.backend.domain.attendance.AttendanceStatus;
import com.schoolmanagement.backend.domain.entity.attendance.Attendance;
import com.schoolmanagement.backend.domain.entity.classes.ClassRoom;
import com.schoolmanagement.backend.domain.entity.admin.School;
import com.schoolmanagement.backend.domain.entity.student.Student;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AttendanceRepository extends JpaRepository<Attendance, UUID> {

        List<Attendance> findAllByStudent(Student student);

        boolean existsByStudent(Student student);

        long countByStudentAndStatus(Student student, String status);

        @Modifying
        @Query("DELETE FROM Attendance e WHERE e.student = :student")
        void deleteAllByStudent(@Param("student") Student student);

        /**
         * Find attendance record for a student on a specific date.
         */
        Optional<Attendance> findByStudentAndAttendanceDate(Student student, LocalDate attendanceDate);

        /**
         * Find all attendance records for a student in a date range.
         */
        @Query("SELECT a FROM Attendance a " +
                        "WHERE a.student = :student " +
                        "AND a.attendanceDate BETWEEN :startDate AND :endDate " +
                        "ORDER BY a.attendanceDate DESC")
        List<Attendance> findByStudentAndDateRange(
                        @Param("student") Student student,
                        @Param("startDate") LocalDate startDate,
                        @Param("endDate") LocalDate endDate);

        /**
         * Find all attendance records for a student in a specific month.
         */
        @Query("SELECT a FROM Attendance a " +
                        "WHERE a.student = :student " +
                        "AND MONTH(a.attendanceDate) = :month " +
                        "AND YEAR(a.attendanceDate) = :year " +
                        "ORDER BY a.attendanceDate DESC")
        List<Attendance> findByStudentAndMonthAndYear(
                        @Param("student") Student student,
                        @Param("month") Integer month,
                        @Param("year") Integer year);

        /**
         * Find all attendance records for a classroom on a specific date.
         */
        List<Attendance> findByClassRoomAndAttendanceDate(ClassRoom classRoom, LocalDate attendanceDate);

        /**
         * Count attendance by status for a student in a date range.
         */
        @Query("SELECT COUNT(a) FROM Attendance a " +
                        "WHERE a.student = :student " +
                        "AND a.attendanceDate BETWEEN :startDate AND :endDate " +
                        "AND a.status = :status")
        long countByStudentAndDateRangeAndStatus(
                        @Param("student") Student student,
                        @Param("startDate") LocalDate startDate,
                        @Param("endDate") LocalDate endDate,
                        @Param("status") AttendanceStatus status);

        /**
         * Count total attendance days for a student in a date range.
         */
        @Query("SELECT COUNT(a) FROM Attendance a " +
                        "WHERE a.student = :student " +
                        "AND a.attendanceDate BETWEEN :startDate AND :endDate")
        long countByStudentAndDateRange(
                        @Param("student") Student student,
                        @Param("startDate") LocalDate startDate,
                        @Param("endDate") LocalDate endDate);

        /**
         * Find attendance records for a school in a date range.
         */
        @Query("SELECT a FROM Attendance a WHERE a.student.school = :school AND a.attendanceDate BETWEEN :startDate AND :endDate")
        List<Attendance> findBySchoolAndDateBetween(
                        @Param("school") School school, @Param("startDate") LocalDate startDate,
                        @Param("endDate") LocalDate endDate);

        List<Attendance> findByClassRoom_SchoolAndAttendanceDateBetween(
                        School school, LocalDate startDate, LocalDate endDate);

        /**
         * Delete all attendance records for a student.
         */
        void deleteByStudent(Student student);

        // ==================== Teacher Portal Methods ====================

        /**
         * Find all attendance records for a class on a specific date and slot.
         * Used to display existing attendance when teacher opens the marking view.
         */
        @EntityGraph(attributePaths = { "student" })
        @Query("SELECT a FROM Attendance a WHERE a.classRoom = :classRoom AND a.attendanceDate = :date AND a.slotIndex = :slotIndex")
        List<Attendance> findAllByClassRoomAndDateAndSlotIndex(
                        @Param("classRoom") ClassRoom classRoom,
                        @Param("date") LocalDate date,
                        @Param("slotIndex") int slotIndex);

        /**
         * Find a single attendance record by student + date + slot.
         * Matches the unique constraint: (student_id, attendance_date, slot_index).
         */
        @Query("SELECT a FROM Attendance a WHERE a.student = :student " +
                        "AND a.attendanceDate = :date AND a.slotIndex = :slotIndex")
        Optional<Attendance> findByStudentAndDateAndSlotIndex(
                        @Param("student") Student student,
                        @Param("date") LocalDate date,
                        @Param("slotIndex") int slotIndex);

        /**
         * Bulk lookup: find all existing attendance records for a list of students
         * on a specific date and slot. Used in saveAttendance to avoid N+1 queries.
         */
        @Query("SELECT a FROM Attendance a WHERE a.student.id IN :studentIds " +
                        "AND a.attendanceDate = :date AND a.slotIndex = :slotIndex")
        List<Attendance> findAllByStudentIdInAndDateAndSlotIndex(
                        @Param("studentIds") List<UUID> studentIds,
                        @Param("date") LocalDate date,
                        @Param("slotIndex") int slotIndex);

        /**
         * Find all attendance records for a class on a specific date (all slots).
         * Used by homeroom daily summary.
         */
        @EntityGraph(attributePaths = { "student" })
        @Query("SELECT a FROM Attendance a WHERE a.classRoom = :classRoom AND a.attendanceDate = :date")
        List<Attendance> findAllByClassRoomAndDate(
                        @Param("classRoom") ClassRoom classRoom,
                        @Param("date") LocalDate date);

        /**
         * Find all attendance records for a class in a date range.
         * Used by homeroom weekly/monthly reports.
         */
        @Query("SELECT a FROM Attendance a WHERE a.classRoom = :classRoom AND a.attendanceDate BETWEEN :startDate AND :endDate")
        List<Attendance> findAllByClassRoomAndDateBetween(
                        @Param("classRoom") ClassRoom classRoom,
                        @Param("startDate") LocalDate startDate,
                        @Param("endDate") LocalDate endDate);

        /**
         * Find all attendance records for a specific student in a date range.
         * Used by student detail view.
         */
        @Query("SELECT a FROM Attendance a WHERE a.student.id = :studentId AND a.attendanceDate BETWEEN :startDate AND :endDate")
        List<Attendance> findAllByStudentIdAndDateBetween(
                        @Param("studentId") UUID studentId,
                        @Param("startDate") LocalDate startDate,
                        @Param("endDate") LocalDate endDate);

        // ==================== Admin / Cleanup Methods ====================

        @Modifying
        @Query("UPDATE Attendance a SET a.teacher = null WHERE a.teacher.id = :teacherId")
        void nullifyTeacherId(@Param("teacherId") UUID teacherId);

        @Modifying
        @Query("DELETE FROM Attendance a WHERE a.student.id = :studentId")
        void deleteByStudentId(@Param("studentId") UUID studentId);

        boolean existsByTeacher(com.schoolmanagement.backend.domain.entity.teacher.Teacher teacher);
}
