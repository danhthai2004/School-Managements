package com.schoolmanagement.backend.repo;

import com.schoolmanagement.backend.domain.entity.Guardian;
import com.schoolmanagement.backend.domain.entity.Student;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface GuardianRepository extends JpaRepository<Guardian, UUID> {

    List<Guardian> findAllByStudent(Student student);

    void deleteAllByStudent(Student student);

    Optional<Guardian> findByEmail(String guardianEmail);
}
