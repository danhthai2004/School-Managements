package com.schoolmanagement.backend.repo.student;

import com.schoolmanagement.backend.domain.entity.admin.School;
import com.schoolmanagement.backend.domain.entity.student.Student;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface StudentRepository extends JpaRepository<Student, UUID>,
                org.springframework.data.jpa.repository.JpaSpecificationExecutor<Student> {
        @org.springframework.data.jpa.repository.EntityGraph(attributePaths = { "guardian", "user" })
        org.springframework.data.domain.Page<Student> findAll(
                        org.springframework.data.jpa.domain.Specification<Student> spec,
                        org.springframework.data.domain.Pageable pageable);

        Optional<Student> findByUser(com.schoolmanagement.backend.domain.entity.auth.User user);

        @org.springframework.data.jpa.repository.EntityGraph(attributePaths = { "guardian", "user" })
        List<Student> findAllBySchoolOrderByFullNameAsc(School school);

        Optional<Student> findBySchoolAndStudentCode(School school, String studentCode);

        boolean existsBySchoolAndStudentCode(School school, String studentCode);

        boolean existsBySchoolAndEmail(School school, String email);

        Optional<Student> findBySchoolAndEmail(School school, String email);

        boolean existsByEmail(String email);

        boolean existsByEmailAndUserIsNotNull(String email);

        Optional<Student> findTopBySchoolOrderByStudentCodeDesc(School school);

        long countBySchool(School school);

        Optional<Student> findByIdAndSchool(UUID id, School school);

        // Find students eligible for account creation: ACTIVE, has email, no user
        // linked
        List<Student> findAllBySchoolAndStatusAndUserIsNullAndEmailIsNotNull(School school,
                        com.schoolmanagement.backend.domain.student.StudentStatus status);

        org.springframework.data.domain.Page<Student> findAllBySchoolAndStatusAndUserIsNullAndEmailIsNotNull(
                        School school,
                        com.schoolmanagement.backend.domain.student.StudentStatus status,
                        org.springframework.data.domain.Pageable pageable);

        // --- Bulk Delete Optimization ---

        @Modifying
        @Query("DELETE FROM ClassEnrollment c WHERE c.student.id IN :ids")
        void deleteAllByStudentIds(@Param("ids") java.util.Collection<java.util.UUID> ids);

        @Modifying
        @Query("DELETE FROM Grade g WHERE g.student.id IN :ids")
        void deleteByStudentIds(@Param("ids") java.util.Collection<java.util.UUID> ids);

        @Query("SELECT DISTINCT g.student.id FROM Grade g WHERE g.student.id IN :ids")
        java.util.Set<java.util.UUID> findStudentIdsWithGrades(@Param("ids") java.util.Collection<java.util.UUID> ids);

        @Modifying
        @Query("DELETE FROM Attendance a WHERE a.student.id IN :ids")
        void deleteAttendanceByStudentIds(@Param("ids") java.util.Collection<java.util.UUID> ids);

        @Query("SELECT DISTINCT a.student.id FROM Attendance a WHERE a.student.id IN :ids")
        java.util.Set<java.util.UUID> findStudentIdsWithAttendance(
                        @Param("ids") java.util.Collection<java.util.UUID> ids);

        @Modifying
        @Query("DELETE FROM FacialRecognitionData b WHERE b.student.id IN :ids")
        void deleteBiometricsByStudentIds(@Param("ids") java.util.Collection<java.util.UUID> ids);

        @Modifying
        @Query("DELETE FROM Attendance a WHERE a.student.id = :studentId")
        void deleteAttendanceByStudentId(@Param("studentId") java.util.UUID studentId);

        @Modifying
        @Query("DELETE FROM Grade g WHERE g.student.id = :studentId")
        void deleteGradesByStudentId(@Param("studentId") java.util.UUID studentId);

        @Modifying
        @Query("DELETE FROM FacialRecognitionData b WHERE b.student.id = :studentId")
        void deleteBiometricsByStudentId(@Param("studentId") java.util.UUID studentId);

        // Find student by linked user ID
        @org.springframework.data.jpa.repository.Query("SELECT s FROM Student s LEFT JOIN FETCH s.school WHERE s.user.id = :userId")
        java.util.Optional<Student> findByUserIdWithDetails(
                        @org.springframework.data.repository.query.Param("userId") java.util.UUID userId);
}
