package com.schoolmanagement.backend.repo;

import com.schoolmanagement.backend.domain.entity.Guardian;
import com.schoolmanagement.backend.domain.entity.Student;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface GuardianRepository extends JpaRepository<Guardian, UUID> {

    List<Guardian> findAllByStudent(Student student);

    long countByUser(com.schoolmanagement.backend.domain.entity.User user);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("DELETE FROM Guardian e WHERE e.student = :student")
    void deleteAllByStudent(@org.springframework.data.repository.query.Param("student") Student student);

    @org.springframework.data.jpa.repository.Query("SELECT g FROM Guardian g JOIN g.student s WHERE s.school = :school AND g.email IS NOT NULL AND g.email != '' AND g.user IS NULL")
    List<Guardian> findOrphanGuardians(
            @org.springframework.data.repository.query.Param("school") com.schoolmanagement.backend.domain.entity.School school);
}
