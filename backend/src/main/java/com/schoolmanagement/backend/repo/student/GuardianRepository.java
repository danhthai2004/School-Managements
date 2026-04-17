package com.schoolmanagement.backend.repo.student;

import com.schoolmanagement.backend.domain.entity.student.Guardian;
<<<<<<< HEAD
import com.schoolmanagement.backend.domain.entity.auth.User;
import org.springframework.data.jpa.repository.JpaRepository;
=======
>>>>>>> c19d40b (fix: merging module sa&teacher)
import com.schoolmanagement.backend.domain.entity.admin.School;
import com.schoolmanagement.backend.domain.entity.student.Student;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface GuardianRepository extends JpaRepository<Guardian, UUID> {

    @Query("SELECT g FROM Guardian g JOIN g.students s WHERE s = :student")
    List<Guardian> findAllByStudent(@Param("student") Student student);

    @org.springframework.data.jpa.repository.Modifying
    @Query("DELETE FROM Guardian g WHERE g.id IN (SELECT g2.id FROM Guardian g2 JOIN g2.students s WHERE s = :student)")
    void deleteAllByStudent(@Param("student") Student student);

    void deleteByUserId(UUID userId);

    List<Guardian> findByEmailIgnoreCase(String email);

    java.util.Optional<Guardian> findByUser(com.schoolmanagement.backend.domain.entity.auth.User user);

<<<<<<< HEAD
    /**
     * Find guardians associated with a specific school who do not have a user
     * account.
     */
    @Query("SELECT DISTINCT g FROM Guardian g JOIN g.students s LEFT JOIN g.user u WHERE s.school = :school AND u.id IS NULL AND g.email IS NOT NULL AND g.email <> ''")
    List<Guardian> findGuardiansWithoutAccount(
            @Param("school") School school);
=======
    // Batch load all guardians for students in a school (N+1 fix)
    @Query("SELECT DISTINCT g FROM Guardian g JOIN g.students s WHERE s.school = :school")
    List<Guardian> findAllByStudentSchool(@Param("school") School school);

    List<Guardian> findAllByUserId(UUID userId);

    // Guardians of a school that have no user account
    @Query("SELECT DISTINCT g FROM Guardian g JOIN g.students s WHERE s.school = :school AND g.user IS NULL AND g.email IS NOT NULL")
    List<Guardian> findGuardiansWithoutAccount(@Param("school") School school);
>>>>>>> c19d40b (fix: merging module sa&teacher)
}
