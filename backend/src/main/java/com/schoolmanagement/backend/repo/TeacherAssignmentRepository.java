package com.schoolmanagement.backend.repo;

import com.schoolmanagement.backend.domain.entity.School;
import com.schoolmanagement.backend.domain.entity.Subject;
import com.schoolmanagement.backend.domain.entity.Teacher;
import com.schoolmanagement.backend.domain.entity.TeacherAssignment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TeacherAssignmentRepository extends JpaRepository<TeacherAssignment, UUID> {

        @org.springframework.data.jpa.repository.Query("SELECT ta FROM TeacherAssignment ta " +
                        "JOIN FETCH ta.teacher " +
                        "JOIN FETCH ta.subject " +
                        "WHERE ta.school = :school")
        List<TeacherAssignment> findAllBySchool(
                        @org.springframework.data.repository.query.Param("school") School school);

        List<TeacherAssignment> findAllBySubjectAndSchool(Subject subject, School school);

        List<TeacherAssignment> findAllByTeacherAndSchool(Teacher teacher, School school);

        Optional<TeacherAssignment> findByTeacherAndSubjectAndSchool(Teacher teacher, Subject subject, School school);

        void deleteBySchoolId(UUID schoolId);

        void deleteByTeacherId(UUID teacherId);

    long countByTeacherId(UUID teacherId);
}
