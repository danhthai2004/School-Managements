package com.schoolmanagement.backend.repo;

import com.schoolmanagement.backend.domain.entity.School;
import com.schoolmanagement.backend.domain.entity.Teacher;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TeacherRepository extends JpaRepository<Teacher, UUID> {

    Optional<Teacher> findByUser(com.schoolmanagement.backend.domain.entity.User user);

    List<Teacher> findAllBySchoolOrderByFullNameAsc(School school);

    List<Teacher> findAllBySchoolOrderByTeacherCodeAsc(School school);

    Optional<Teacher> findBySchoolAndTeacherCode(School school, String teacherCode);

    boolean existsBySchoolAndTeacherCode(School school, String teacherCode);

    Optional<Teacher> findTopBySchoolOrderByTeacherCodeDesc(School school);

    boolean existsByEmailIgnoreCase(String email);

    // Check if duplicate teacher code exists in school
    boolean existsBySchoolAndTeacherCodeAndIdNot(School school, String teacherCode, UUID id);

    long countBySchool(School school);

    // --- Bulk Delete Optimization ---

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("UPDATE TimetableDetail t SET t.teacher = null WHERE t.teacher.id = :teacherId")
    void removeTeacherFromTimetable(@org.springframework.data.repository.query.Param("teacherId") UUID teacherId);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("DELETE FROM TeacherAssignment ta WHERE ta.teacher.id = :teacherId")
    void removeTeacherAssignments(@org.springframework.data.repository.query.Param("teacherId") UUID teacherId);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("DELETE FROM Teacher t WHERE t.school.id = :schoolId")
    void deleteBySchoolId(@org.springframework.data.repository.query.Param("schoolId") UUID schoolId);
}
