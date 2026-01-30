package com.schoolmanagement.backend.repo;

import com.schoolmanagement.backend.domain.entity.School;
import com.schoolmanagement.backend.domain.entity.Teacher;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TeacherRepository extends JpaRepository<Teacher, UUID> {
    List<Teacher> findAllBySchoolOrderByFullNameAsc(School school);

    List<Teacher> findAllBySchoolOrderByTeacherCodeAsc(School school);

    Optional<Teacher> findBySchoolAndTeacherCode(School school, String teacherCode);

    boolean existsBySchoolAndTeacherCode(School school, String teacherCode);

    Optional<Teacher> findTopBySchoolOrderByTeacherCodeDesc(School school);

    boolean existsByEmailIgnoreCase(String email);

    // Check if duplicate teacher code exists in school
    boolean existsBySchoolAndTeacherCodeAndIdNot(School school, String teacherCode, UUID id);

    void deleteBySchoolId(UUID schoolId);
}
