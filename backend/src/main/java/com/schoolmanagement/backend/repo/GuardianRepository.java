package com.schoolmanagement.backend.repo;

import com.schoolmanagement.backend.domain.entity.Guardian;
import com.schoolmanagement.backend.domain.entity.School;
import com.schoolmanagement.backend.domain.entity.Student;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface GuardianRepository extends JpaRepository<Guardian, UUID> {

    List<Guardian> findAllByStudent(Student student);

    void deleteAllByStudent(Student student);

    void deleteByUserId(UUID userId);

    // Batch load all guardians for students in a school (N+1 fix)
    @Query("SELECT g FROM Guardian g WHERE g.student.school = :school")
    List<Guardian> findAllByStudentSchool(@Param("school") School school);

    List<Guardian> findAllByUserId(UUID userId);

    // Guardians of a school that have no user account
    @Query("SELECT g FROM Guardian g WHERE g.student.school = :school AND g.user IS NULL AND g.email IS NOT NULL")
    List<Guardian> findGuardiansWithoutAccount(@Param("school") School school);
}
