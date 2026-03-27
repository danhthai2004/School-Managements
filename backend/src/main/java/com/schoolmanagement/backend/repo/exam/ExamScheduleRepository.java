package com.schoolmanagement.backend.repo.exam;

import com.schoolmanagement.backend.domain.exam.ExamStatus;

import com.schoolmanagement.backend.domain.entity.classes.ClassRoom;
import com.schoolmanagement.backend.domain.entity.exam.ExamSchedule;
import com.schoolmanagement.backend.domain.entity.admin.School;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Repository
public interface ExamScheduleRepository extends JpaRepository<ExamSchedule, UUID> {

        /**
         * Find all exam schedules for a classroom in a specific academic year and
         * semester.
         */
        @Query("SELECT e FROM ExamSchedule e " +
                        "JOIN FETCH e.subject " +
                        "WHERE e.classRoom = :classRoom " +
                        "AND e.academicYear = :academicYear " +
                        "AND e.semester = :semester " +
                        "ORDER BY e.examDate, e.startTime")
        List<ExamSchedule> findByClassRoomAndAcademicYearAndSemester(
                        @Param("classRoom") ClassRoom classRoom,
                        @Param("academicYear") com.schoolmanagement.backend.domain.entity.admin.AcademicYear academicYear,
                        @Param("semester") com.schoolmanagement.backend.domain.entity.admin.Semester semester);

        /**
         * Find all exam schedules for a classroom and academic year.
         */
        @Query("SELECT e FROM ExamSchedule e " +
                        "JOIN FETCH e.subject " +
                        "WHERE e.classRoom = :classRoom " +
                        "AND e.academicYear = :academicYear " +
                        "ORDER BY e.examDate, e.startTime")
        List<ExamSchedule> findByClassRoomAndAcademicYear(
                        @Param("classRoom") ClassRoom classRoom,
                        @Param("academicYear") com.schoolmanagement.backend.domain.entity.admin.AcademicYear academicYear);

        /**
         * Find upcoming exams for a classroom (exam date >= today).
         */
        @Query("SELECT e FROM ExamSchedule e " +
                        "JOIN FETCH e.subject " +
                        "WHERE e.classRoom = :classRoom " +
                        "AND e.examDate >= :today " +
                        "AND e.status = :status " +
                        "ORDER BY e.examDate, e.startTime")
        List<ExamSchedule> findUpcomingByClassRoom(
                        @Param("classRoom") ClassRoom classRoom,
                        @Param("today") LocalDate today,
                        @Param("status") ExamStatus status);

        /**
         * Find all exam schedules for a classroom.
         */
        @Query("SELECT e FROM ExamSchedule e " +
                        "JOIN FETCH e.subject " +
                        "WHERE e.classRoom = :classRoom " +
                        "ORDER BY e.examDate DESC, e.startTime")
        List<ExamSchedule> findByClassRoom(@Param("classRoom") ClassRoom classRoom);

        /**
         * Find exam schedules by classroom and date range.
         */
        @Query("SELECT e FROM ExamSchedule e " +
                        "JOIN FETCH e.subject " +
                        "WHERE e.classRoom = :classRoom " +
                        "AND e.examDate BETWEEN :startDate AND :endDate " +
                        "ORDER BY e.examDate, e.startTime")
        List<ExamSchedule> findByClassRoomAndDateRange(
                        @Param("classRoom") ClassRoom classRoom,
                        @Param("startDate") LocalDate startDate,
                        @Param("endDate") LocalDate endDate);

        /**
         * Find exam schedules by school, academic year and semester.
         */
        List<ExamSchedule> findBySchoolAndAcademicYearAndSemester(
                        School school, 
                        com.schoolmanagement.backend.domain.entity.admin.AcademicYear academicYear, 
                        com.schoolmanagement.backend.domain.entity.admin.Semester semester);

        /**
         * Count exams by classroom and status.
         */
        long countByClassRoomAndStatus(ClassRoom classRoom, ExamStatus status);

        /**
         * Delete all exam schedules for a classroom.
         */
        void deleteByClassRoom(ClassRoom classRoom);

        @Modifying
        @Query("DELETE FROM ExamSchedule es WHERE es.examSession.id = :sessionId")
        void deleteBySessionId(@Param("sessionId") UUID sessionId);

        /**
         * Find all exam schedules belonging to an ExamSession, ordered by date and
         * time.
         */
        @Query("SELECT es FROM ExamSchedule es " +
                        "JOIN FETCH es.subject " +
                        "WHERE es.examSession.id = :sessionId " +
                        "ORDER BY es.examDate, es.startTime")
        List<ExamSchedule> findByExamSessionIdOrderByExamDate(@Param("sessionId") UUID sessionId);
}
