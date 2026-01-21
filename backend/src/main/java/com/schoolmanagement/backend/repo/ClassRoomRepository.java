package com.schoolmanagement.backend.repo;

import com.schoolmanagement.backend.domain.entity.ClassRoom;
import com.schoolmanagement.backend.domain.entity.School;
import com.schoolmanagement.backend.domain.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ClassRoomRepository extends JpaRepository<ClassRoom, UUID> {

    List<ClassRoom> findAllBySchoolOrderByGradeAscNameAsc(School school);

    Optional<ClassRoom> findBySchoolAndName(School school, String name);

    long countBySchool(School school);

    boolean existsBySchoolAndName(School school, String name);

    boolean existsBySchoolAndNameAndAcademicYear(School school, String name, String academicYear);

    boolean existsByHomeroomTeacherAndAcademicYear(User homeroomTeacher, String academicYear);

    Optional<ClassRoom> findFirstBySchoolOrderByAcademicYearDesc(School school);

    Optional<ClassRoom> findByHomeroomTeacher(User homeroomTeacher);
}
