package com.schoolmanagement.backend.repo.teacher;

import com.schoolmanagement.backend.domain.entity.admin.School;
import com.schoolmanagement.backend.domain.entity.teacher.Teacher;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TeacherRepository extends JpaRepository<Teacher, UUID> {

        Optional<Teacher> findByUser(com.schoolmanagement.backend.domain.entity.auth.User user);

        @org.springframework.data.jpa.repository.EntityGraph(attributePaths = { "subjects", "user" })
        List<Teacher> findAllBySchoolOrderByFullNameAsc(School school);

        List<Teacher> findByEmailIn(Collection<String> emails);

        @org.springframework.data.jpa.repository.EntityGraph(attributePaths = { "subjects", "user" })
        org.springframework.data.domain.Page<Teacher> findAllBySchoolOrderByTeacherCodeAsc(School school,
                        org.springframework.data.domain.Pageable pageable);

        @org.springframework.data.jpa.repository.EntityGraph(attributePaths = { "subjects", "user" })
        org.springframework.data.domain.Page<Teacher> findBySchoolAndFullNameContainingIgnoreCase(School school,
                        String fullName, org.springframework.data.domain.Pageable pageable);

        @org.springframework.data.jpa.repository.EntityGraph(attributePaths = { "subjects", "user" })
        Optional<Teacher> findBySchoolAndTeacherCode(School school, String teacherCode);

        boolean existsBySchoolAndTeacherCode(School school, String teacherCode);

        @org.springframework.data.jpa.repository.Query(
                "SELECT t.teacherCode FROM Teacher t WHERE t.school = :school AND t.teacherCode LIKE 'GV%'")
        List<String> findAllTeacherCodesBySchool(
                @org.springframework.data.repository.query.Param("school") School school);

        boolean existsByEmailIgnoreCase(String email);

        // Check if duplicate teacher code exists in school
        boolean existsBySchoolAndTeacherCodeAndIdNot(School school, String teacherCode, UUID id);

        long countBySchool(School school);

        @org.springframework.data.jpa.repository.EntityGraph(attributePaths = { "subjects", "user" })
        @org.springframework.data.jpa.repository.Query("SELECT t FROM Teacher t WHERE t.school = :school AND t.status = 'ACTIVE' AND t.user IS NULL AND t.email IS NOT NULL AND t.email <> ''")
        org.springframework.data.domain.Page<Teacher> findEligibleForAccount(
                        @org.springframework.data.repository.query.Param("school") School school,
                        org.springframework.data.domain.Pageable pageable);

        // --- Bulk Delete Optimization ---

        @org.springframework.data.jpa.repository.Modifying
        @org.springframework.data.jpa.repository.Query("UPDATE TimetableDetail t SET t.teacher = null WHERE t.teacher.id = :teacherId")
        void removeTeacherFromTimetable(@org.springframework.data.repository.query.Param("teacherId") UUID teacherId);

        @org.springframework.data.jpa.repository.Modifying
        @org.springframework.data.jpa.repository.Query("DELETE FROM TeacherAssignment ta WHERE ta.teacher.id = :teacherId")
        void removeTeacherAssignments(@org.springframework.data.repository.query.Param("teacherId") UUID teacherId);
}
