package com.schoolmanagement.backend.repo.student;

import com.schoolmanagement.backend.domain.entity.admin.School;
import com.schoolmanagement.backend.domain.entity.student.Student;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface StudentRepository extends JpaRepository<Student, UUID> {

    Optional<Student> findByUser(com.schoolmanagement.backend.domain.entity.auth.User user);

    List<Student> findAllBySchoolOrderByFullNameAsc(School school);

    Optional<Student> findBySchoolAndStudentCode(School school, String studentCode);

    boolean existsBySchoolAndStudentCode(School school, String studentCode);

    boolean existsBySchoolAndEmail(School school, String email);

    Optional<Student> findBySchoolAndEmail(School school, String email);

    boolean existsByEmail(String email);

    Optional<Student> findTopBySchoolOrderByStudentCodeDesc(School school);

    long countBySchool(School school);

    Optional<Student> findByIdAndSchool(UUID id, School school);

    // Find students eligible for account creation: ACTIVE, has email, no user
    // linked
    List<Student> findAllBySchoolAndStatusAndUserIsNullAndEmailIsNotNull(School school,
            com.schoolmanagement.backend.domain.student.StudentStatus status);

    // --- Bulk Delete Optimization ---

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("DELETE FROM Attendance a WHERE a.student.id = :studentId")
    void deleteAttendanceByStudentId(@org.springframework.data.repository.query.Param("studentId") UUID studentId);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("DELETE FROM Grade g WHERE g.student.id = :studentId")
    void deleteGradesByStudentId(@org.springframework.data.repository.query.Param("studentId") UUID studentId);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("DELETE FROM FacialRecognitionData b WHERE b.student.id = :studentId")
    void deleteBiometricsByStudentId(@org.springframework.data.repository.query.Param("studentId") UUID studentId);

    // Find student by linked user ID
    @org.springframework.data.jpa.repository.Query("SELECT s FROM Student s LEFT JOIN FETCH s.school WHERE s.user.id = :userId")
    java.util.Optional<Student> findByUserIdWithDetails(
            @org.springframework.data.repository.query.Param("userId") java.util.UUID userId);
}
