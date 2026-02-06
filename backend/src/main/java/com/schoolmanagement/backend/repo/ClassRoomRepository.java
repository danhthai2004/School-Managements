package com.schoolmanagement.backend.repo;

import com.schoolmanagement.backend.domain.ClassDepartment;
import com.schoolmanagement.backend.domain.ClassRoomStatus;
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

        // Find classes by department, grade, academic year for auto-assignment
        List<ClassRoom> findAllBySchoolAndDepartmentAndGradeAndAcademicYearAndStatus(
                        School school,
                        ClassDepartment department,
                        int grade,
                        String academicYear,
                        ClassRoomStatus status);

        // Find all active classes for a grade and academic year
        List<ClassRoom> findAllBySchoolAndGradeAndAcademicYearAndStatus(
                        School school,
                        int grade,
                        String academicYear,
                        ClassRoomStatus status);

        Optional<ClassRoom> findByHomeroomTeacher(User homeroomTeacher);

        // Find classrooms by school and list of grades
        List<ClassRoom> findBySchoolAndGradeIn(School school, List<Integer> grades);
}
