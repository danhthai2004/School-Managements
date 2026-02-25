package com.schoolmanagement.backend.repo;

import com.schoolmanagement.backend.domain.AttendanceStatus;
import com.schoolmanagement.backend.domain.entity.Attendance;
import com.schoolmanagement.backend.domain.entity.AttendanceSession;
import com.schoolmanagement.backend.domain.entity.ClassRoom;
import com.schoolmanagement.backend.domain.entity.School;
import com.schoolmanagement.backend.domain.entity.Student;
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

        List<Attendance> findAllBySession(AttendanceSession session);

        List<Attendance> findAllByStudent(Student student);

        boolean existsByStudent(Student student);

        List<Attendance> findAllBySessionIn(List<AttendanceSession> sessions);

        long countBySessionAndStatus(AttendanceSession session, String status);

        long countByStudentAndStatus(Student student, String status);

        @Modifying
        @Query("DELETE FROM Attendance e WHERE e.student = :student")
        void deleteAllByStudent(@Param("student") Student student);

        @Query("SELECT a FROM Attendance a WHERE a.session IN :sessions AND a.status = :status")
        List<Attendance> findAllBySessionsAndStatus(@Param("sessions") List<AttendanceSession> sessions,
                        @Param("status") String status);

        @Query("SELECT a.student, COUNT(a) FROM Attendance a WHERE a.session IN :sessions AND a.status = 'ABSENT' GROUP BY a.student HAVING COUNT(a) >= :threshold")
        List<Object[]> findChronicAbsentees(@Param("sessions") List<AttendanceSession> sessions,
                        @Param("threshold") long threshold);

        @Modifying
        void deleteAllBySessionIn(List<AttendanceSession> sessions);

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
        List<Attendance> findBySchoolAndAttendanceDateBetween(
                        School school, LocalDate startDate, LocalDate endDate);

        /**
         * Delete all attendance records for a student.
         */
        void deleteByStudent(Student student);
}
