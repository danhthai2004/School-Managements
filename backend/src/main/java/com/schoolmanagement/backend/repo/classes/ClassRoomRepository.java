package com.schoolmanagement.backend.repo.classes;

import com.schoolmanagement.backend.domain.classes.ClassDepartment;
import com.schoolmanagement.backend.domain.classes.ClassRoomStatus;
import com.schoolmanagement.backend.domain.entity.classes.ClassRoom;
import com.schoolmanagement.backend.domain.entity.admin.School;
import com.schoolmanagement.backend.domain.entity.auth.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ClassRoomRepository extends JpaRepository<ClassRoom, UUID> {

        List<ClassRoom> findAllBySchoolOrderByGradeAscNameAsc(School school);

        Optional<ClassRoom> findBySchoolAndName(School school, String name);

        long countBySchool(School school);

        Optional<ClassRoom> findByIdAndSchool(UUID id, School school);

        boolean existsBySchoolAndName(School school, String name);

        boolean existsBySchoolAndNameAndAcademicYear(School school, String name, com.schoolmanagement.backend.domain.entity.admin.AcademicYear academicYear);

        boolean existsByHomeroomTeacherAndAcademicYear(User homeroomTeacher, com.schoolmanagement.backend.domain.entity.admin.AcademicYear academicYear);

        Optional<ClassRoom> findFirstBySchoolOrderByAcademicYearDesc(School school);

        // Find classes by department, grade, academic year for auto-assignment
        List<ClassRoom> findAllBySchoolAndDepartmentAndGradeAndAcademicYearAndStatus(
                        School school,
                        ClassDepartment department,
                        int grade,
                        com.schoolmanagement.backend.domain.entity.admin.AcademicYear academicYear,
                        ClassRoomStatus status);

        // Find all active classes for a grade and academic year
        List<ClassRoom> findAllBySchoolAndGradeAndAcademicYearAndStatus(
                        School school,
                        int grade,
                        com.schoolmanagement.backend.domain.entity.admin.AcademicYear academicYear,
                        ClassRoomStatus status);

        Optional<ClassRoom> findByHomeroomTeacher(User homeroomTeacher);

        // Find classrooms by school and list of grades
        List<ClassRoom> findBySchoolAndGradeIn(School school, List<Integer> grades);

        // --- Methods added for Teacher Portal (fuuko branch) ---

        Optional<ClassRoom> findByHomeroomTeacher_IdAndAcademicYear(UUID teacherId, com.schoolmanagement.backend.domain.entity.admin.AcademicYear academicYear);

        Optional<ClassRoom> findTopByHomeroomTeacher_IdOrderByAcademicYear_StartDateDesc(UUID teacherId);

        @Modifying
        @Query("UPDATE ClassRoom c SET c.homeroomTeacher = null WHERE c.homeroomTeacher.id = :userId")
        void nullifyHomeroomTeacher(@Param("userId") UUID userId);

        boolean existsByCombination(com.schoolmanagement.backend.domain.entity.classes.Combination combination);

        boolean existsByRoomAndAcademicYear(com.schoolmanagement.backend.domain.entity.classes.Room room,
                        com.schoolmanagement.backend.domain.entity.admin.AcademicYear academicYear);

        Optional<ClassRoom> findByRoomAndAcademicYear(com.schoolmanagement.backend.domain.entity.classes.Room room,
                        com.schoolmanagement.backend.domain.entity.admin.AcademicYear academicYear);

        long countByAcademicYear(com.schoolmanagement.backend.domain.entity.admin.AcademicYear academicYear);
}
