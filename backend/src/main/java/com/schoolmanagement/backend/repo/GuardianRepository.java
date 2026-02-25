package com.schoolmanagement.backend.repo;

import com.schoolmanagement.backend.domain.entity.Guardian;
import com.schoolmanagement.backend.domain.entity.Student;
import com.schoolmanagement.backend.domain.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import com.schoolmanagement.backend.domain.entity.School;
import org.springframework.stereotype.Repository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

@Repository
public interface GuardianRepository extends JpaRepository<Guardian, UUID> {

    java.util.Optional<Guardian> findByUser(User user);

    List<Guardian> findByEmail(String email);

    java.util.List<Guardian> findByEmailIgnoreCase(String email);

    long countByUser(User user);

    /**
     * Find guardians that have no associated students (Orphans).
     */
    @Query("SELECT g FROM Guardian g WHERE g.user IS NULL AND g.students IS EMPTY")
    List<Guardian> findOrphanGuardians();

    /**
     * Find guardians associated with a specific school who do not have a user
     * account.
     */
    @Query("SELECT DISTINCT g FROM Guardian g JOIN g.students s LEFT JOIN g.user u WHERE s.school = :school AND u.id IS NULL")
    List<Guardian> findGuardiansWithoutAccount(
            @Param("school") School school);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("DELETE FROM Guardian g WHERE g.user.id = :userId")
    void deleteByUserId(@org.springframework.data.repository.query.Param("userId") UUID userId);
}
