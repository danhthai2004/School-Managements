package com.schoolmanagement.backend.repo;

import com.schoolmanagement.backend.domain.SubjectType;
import com.schoolmanagement.backend.domain.entity.Subject;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SubjectRepository extends JpaRepository<Subject, UUID> {
    Optional<Subject> findByCode(String code);

    List<Subject> findByTypeAndActiveTrue(SubjectType type);

    boolean existsByCode(String code);

    Optional<Subject> findByNameIgnoreCase(String name);
}
