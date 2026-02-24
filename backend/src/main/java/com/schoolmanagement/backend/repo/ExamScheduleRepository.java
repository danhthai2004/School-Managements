package com.schoolmanagement.backend.repo;

import com.schoolmanagement.backend.domain.ExamStatus;
import com.schoolmanagement.backend.domain.ExamType;
import com.schoolmanagement.backend.domain.entity.ClassRoom;
import com.schoolmanagement.backend.domain.entity.ExamSchedule;
import com.schoolmanagement.backend.domain.entity.School;
import com.schoolmanagement.backend.domain.entity.Subject;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Repository
public interface ExamScheduleRepository extends JpaRepository<ExamSchedule, UUID> {

    /**
     * Find all exam schedules for a classroom in a specific academic year and semester.
     */
    @Query("SELECT e FROM ExamSchedule e " +
           "JOIN FETCH e.subject " +
           "WHERE e.classRoom = :classRoom " +
           "AND e.academicYear = :academicYear " +
           "AND e.semester = :semester " +
           "ORDER BY e.examDate, e.startTime")
    List<ExamSchedule> findByClassRoomAndAcademicYearAndSemester(
            @Param("classRoom") ClassRoom classRoom,
            @Param("academicYear") String academicYear,
            @Param("semester") Integer semester);

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
            @Param("academicYear") String academicYear);

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
            School school, String academicYear, Integer semester);

    /**
     * Find exam schedules by subject.
     */
    List<ExamSchedule> findBySubjectAndAcademicYearAndSemester(
            Subject subject, String academicYear, Integer semester);

    /**
     * Find exam schedules by type.
     */
    List<ExamSchedule> findByClassRoomAndExamTypeAndAcademicYearAndSemester(
            ClassRoom classRoom, ExamType examType, String academicYear, Integer semester);

    /**
     * Count exams by classroom and status.
     */
    long countByClassRoomAndStatus(ClassRoom classRoom, ExamStatus status);

    /**
     * Delete all exam schedules for a classroom.
     */
    void deleteByClassRoom(ClassRoom classRoom);
}
