package com.schoolmanagement.backend.repo;

import com.schoolmanagement.backend.domain.ScoreType;
import com.schoolmanagement.backend.domain.entity.School;
import com.schoolmanagement.backend.domain.entity.Score;
import com.schoolmanagement.backend.domain.entity.Student;
import com.schoolmanagement.backend.domain.entity.Subject;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ScoreRepository extends JpaRepository<Score, UUID> {

    /**
     * Find all scores for a student in a specific academic year and semester.
     */
    @Query("SELECT s FROM Score s " +
           "JOIN FETCH s.subject " +
           "WHERE s.student = :student " +
           "AND s.academicYear = :academicYear " +
           "AND s.semester = :semester " +
           "ORDER BY s.subject.name, s.scoreType")
    List<Score> findByStudentAndAcademicYearAndSemester(
            @Param("student") Student student,
            @Param("academicYear") String academicYear,
            @Param("semester") Integer semester);

    /**
     * Find all scores for a student in a specific academic year (both semesters).
     */
    @Query("SELECT s FROM Score s " +
           "JOIN FETCH s.subject " +
           "WHERE s.student = :student " +
           "AND s.academicYear = :academicYear " +
           "ORDER BY s.semester, s.subject.name, s.scoreType")
    List<Score> findByStudentAndAcademicYear(
            @Param("student") Student student,
            @Param("academicYear") String academicYear);

    /**
     * Find all scores for a student, subject, academic year and semester.
     */
    List<Score> findByStudentAndSubjectAndAcademicYearAndSemester(
            Student student, Subject subject, String academicYear, Integer semester);

    /**
     * Find a specific score by student, subject, score type, academic year and semester.
     */
    Optional<Score> findByStudentAndSubjectAndScoreTypeAndAcademicYearAndSemester(
            Student student, Subject subject, ScoreType scoreType, 
            String academicYear, Integer semester);

    /**
     * Find all scores for a school in a specific academic year and semester.
     */
    List<Score> findBySchoolAndAcademicYearAndSemester(
            School school, String academicYear, Integer semester);

    /**
     * Count scores by student.
     */
    long countByStudent(Student student);

    /**
     * Delete all scores for a student.
     */
    void deleteByStudent(Student student);
}
