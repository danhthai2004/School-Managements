package com.schoolmanagement.backend.repo.grade;

import com.schoolmanagement.backend.domain.entity.grade.Score;
import com.schoolmanagement.backend.domain.entity.student.Student;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
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
                        @Param("academicYear") com.schoolmanagement.backend.domain.entity.admin.AcademicYear academicYear,
                        @Param("semester") com.schoolmanagement.backend.domain.entity.admin.Semester semester);

        /**
         * Find all scores for a student in a specific academic year (both semesters).
         */
        @Query("SELECT s FROM Score s " +
                        "JOIN FETCH s.subject " +
                        "WHERE s.student = :student " +
                        "AND s.academicYear = :academicYear " +
                        "ORDER BY s.semester.semesterNumber, s.subject.name, s.scoreType")
        List<Score> findByStudentAndAcademicYear(
                        @Param("student") Student student,
                        @Param("academicYear") com.schoolmanagement.backend.domain.entity.admin.AcademicYear academicYear);

        /**
         * Find all scores for a school in a specific academic year and semester.
         */
        List<Score> findBySchoolAndAcademicYearAndSemester(
                        com.schoolmanagement.backend.domain.entity.admin.School school,
                        com.schoolmanagement.backend.domain.entity.admin.AcademicYear academicYear,
                        com.schoolmanagement.backend.domain.entity.admin.Semester semester);

        /**
         * Count scores by student.
         */
        long countByStudent(Student student);

        /**
         * Delete all scores for a student.
         */
        void deleteByStudent(Student student);
}
