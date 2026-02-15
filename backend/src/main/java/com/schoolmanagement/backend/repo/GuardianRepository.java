package com.schoolmanagement.backend.repo;

import com.schoolmanagement.backend.domain.entity.Guardian;
import com.schoolmanagement.backend.domain.entity.Student;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface GuardianRepository extends JpaRepository<Guardian, UUID> {

    java.util.Optional<Guardian> findByEmail(String email);

    long countByUser(com.schoolmanagement.backend.domain.entity.User user);

    /**
     * Find guardians that have no associated students (Orphans).
     */
    @org.springframework.data.jpa.repository.Query("SELECT g FROM Guardian g WHERE g.user IS NULL AND g.students IS EMPTY")
    List<Guardian> findOrphanGuardians();

    /**
     * Find guardians associated with a specific school who do not have a user
     * account.
     */
    @org.springframework.data.jpa.repository.Query("SELECT DISTINCT g FROM Guardian g JOIN g.students s WHERE s.school = :school AND g.user IS NULL")
    List<Guardian> findGuardiansWithoutAccount(
            @org.springframework.data.repository.query.Param("school") com.schoolmanagement.backend.domain.entity.School school);
}
