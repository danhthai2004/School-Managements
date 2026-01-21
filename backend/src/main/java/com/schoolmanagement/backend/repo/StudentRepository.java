package com.schoolmanagement.backend.repo;

import com.schoolmanagement.backend.domain.entity.School;
import com.schoolmanagement.backend.domain.entity.Student;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface StudentRepository extends JpaRepository<Student, UUID> {

    List<Student> findAllBySchoolOrderByFullNameAsc(School school);

    Optional<Student> findBySchoolAndStudentCode(School school, String studentCode);

    boolean existsBySchoolAndStudentCode(School school, String studentCode);

    Optional<Student> findTopBySchoolOrderByStudentCodeDesc(School school);

    long countBySchool(School school);
}
