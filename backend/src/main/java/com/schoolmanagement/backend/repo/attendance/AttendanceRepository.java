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
        @Query("SELECT a FROM Attendance a WHERE a.student = :student AND a.attendanceDate = :date")
        Optional<Attendance> findByStudentAndDate(@Param("student") Student student, @Param("date") LocalDate date);

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
        @Query("SELECT a FROM Attendance a WHERE a.classRoom = :classRoom AND a.attendanceDate = :date")
        List<Attendance> findByClassRoomAndDate(@Param("classRoom") ClassRoom classRoom, @Param("date") LocalDate date);

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
                        @Param("school") School school, @Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);

        /**
         * Delete all attendance records for a student.
         */
        void deleteByStudent(Student student);

        // ==================== Teacher Portal Methods ====================

        @EntityGraph(attributePaths = { "student" })
        @Query("SELECT a FROM Attendance a WHERE a.classRoom = :classRoom AND a.attendanceDate = :date AND a.slotIndex = :slotIndex")
        List<Attendance> findAllByClassRoomAndDateAndSlotIndex(
                        @Param("classRoom") ClassRoom classRoom,
                        @Param("date") LocalDate date,
                        @Param("slotIndex") int slotIndex);

        @Query("SELECT a FROM Attendance a WHERE a.student = :student AND a.attendanceDate = :date AND a.slotIndex = :slotIndex")
        Optional<Attendance> findByStudentAndDateAndSlotIndex(
                        @Param("student") Student student,
                        @Param("date") LocalDate date,
                        @Param("slotIndex") int slotIndex);

        @Query("SELECT a FROM Attendance a WHERE a.student.id IN :studentIds AND a.attendanceDate = :date AND a.slotIndex = :slotIndex")
        List<Attendance> findAllByStudentIdInAndDateAndSlotIndex(
                        @Param("studentIds") List<UUID> studentIds,
                        @Param("date") LocalDate date,
                        @Param("slotIndex") int slotIndex);

        @EntityGraph(attributePaths = { "student" })
        @Query("SELECT a FROM Attendance a WHERE a.classRoom = :classRoom AND a.attendanceDate = :date")
        List<Attendance> findByClassRoomAndAttendanceDate(
                        @Param("classRoom") ClassRoom classRoom,
                        @Param("date") LocalDate date);

        @EntityGraph(attributePaths = { "student" })
        @Query("SELECT a FROM Attendance a WHERE a.classRoom = :classRoom AND a.attendanceDate = :date")
        List<Attendance> findAllByClassRoomAndDate(
                        @Param("classRoom") ClassRoom classRoom,
                        @Param("date") LocalDate date);

        @Query("SELECT a FROM Attendance a WHERE a.classRoom = :classRoom AND a.attendanceDate BETWEEN :startDate AND :endDate")
        List<Attendance> findAllByClassRoomAndDateBetween(
                        @Param("classRoom") ClassRoom classRoom,
                        @Param("startDate") LocalDate startDate,
                        @Param("endDate") LocalDate endDate);

        @Query("SELECT a FROM Attendance a WHERE a.student.id = :studentId AND a.attendanceDate BETWEEN :startDate AND :endDate")
        List<Attendance> findAllByStudentIdAndDateBetween(
                        @Param("studentId") UUID studentId,
                        @Param("startDate") LocalDate startDate,
                        @Param("endDate") LocalDate endDate);

        @Query("SELECT a FROM Attendance a WHERE a.classRoom.school = :school AND a.attendanceDate BETWEEN :startDate AND :endDate")
        List<Attendance> findByClassRoom_SchoolAndAttendanceDateBetween(
                        @Param("school") com.schoolmanagement.backend.domain.entity.admin.School school,
                        @Param("startDate") LocalDate startDate,
                        @Param("endDate") LocalDate endDate);

        // ==================== Upsert ====================

        /**
         * Atomic upsert: INSERT on first save, UPDATE on conflict with (student_id, attendance_date, slot_index).
         * Prevents DataIntegrityViolationException from concurrent duplicate submissions.
         */
        @Modifying
        @Query(value = """
                INSERT INTO attendance (id, student_id, classroom_id, subject_id, teacher_id, attendance_date, slot_index, status, remarks, created_at, updated_at)
                VALUES (gen_random_uuid(), :studentId, :classRoomId, :subjectId, :teacherId, :date, :slotIndex, :status, :remarks, NOW(), NOW())
                ON CONFLICT (student_id, attendance_date, slot_index) DO UPDATE SET
                    status     = EXCLUDED.status,
                    remarks    = EXCLUDED.remarks,
                    teacher_id = EXCLUDED.teacher_id,
                    classroom_id = EXCLUDED.classroom_id,
                    subject_id = EXCLUDED.subject_id,
                    updated_at = NOW()
                """, nativeQuery = true)
        void upsertAttendanceRecord(
                @Param("studentId") UUID studentId,
                @Param("classRoomId") UUID classRoomId,
                @Param("subjectId") UUID subjectId,
                @Param("teacherId") UUID teacherId,
                @Param("date") java.time.LocalDate date,
                @Param("slotIndex") int slotIndex,
                @Param("status") String status,
                @Param("remarks") String remarks);

        // ==================== Admin / Cleanup Methods ====================

        @Modifying
        @Query("UPDATE Attendance a SET a.teacher = null WHERE a.teacher.id = :teacherId")
        void nullifyTeacherId(@Param("teacherId") UUID teacherId);

        @Modifying
        @Query("DELETE FROM Attendance a WHERE a.student.id = :studentId")
        void deleteByStudentId(@Param("studentId") UUID studentId);

        boolean existsByTeacher(com.schoolmanagement.backend.domain.entity.teacher.Teacher teacher);
}
