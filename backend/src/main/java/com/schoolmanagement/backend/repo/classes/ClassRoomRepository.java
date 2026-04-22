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

        List<ClassRoom> findAllBySchool(School school);

        default List<ClassRoom> findAllBySchoolOrderByGradeAscNameAsc(School school) {
                List<ClassRoom> list = findAllBySchool(school);
                list.sort((c1, c2) -> {
                        int gradeCmp = Integer.compare(c1.getGrade(), c2.getGrade());
                        if (gradeCmp != 0)
                                return gradeCmp;

                        String s1 = c1.getName() != null ? c1.getName() : "";
                        String s2 = c2.getName() != null ? c2.getName() : "";

                        String p1 = s1.replaceAll("\\d+$", "");
                        String n1 = s1.substring(p1.length());

                        String p2 = s2.replaceAll("\\d+$", "");
                        String n2 = s2.substring(p2.length());

                        int pCmp = p1.compareTo(p2);
                        if (pCmp != 0)
                                return pCmp;

                        if (n1.isEmpty() && n2.isEmpty())
                                return 0;
                        if (n1.isEmpty())
                                return -1;
                        if (n2.isEmpty())
                                return 1;

                        return Integer.compare(Integer.parseInt(n1), Integer.parseInt(n2));
                });
                return list;
        }

        Optional<ClassRoom> findBySchoolAndName(School school, String name);

        long countBySchool(School school);

        Optional<ClassRoom> findByIdAndSchool(UUID id, School school);

        boolean existsBySchoolAndName(School school, String name);

        boolean existsBySchoolAndNameAndAcademicYear(School school, String name,
                        com.schoolmanagement.backend.domain.entity.admin.AcademicYear academicYear);

        boolean existsByHomeroomTeacherAndAcademicYear(User homeroomTeacher,
                        com.schoolmanagement.backend.domain.entity.admin.AcademicYear academicYear);

        Optional<ClassRoom> findFirstBySchoolOrderByAcademicYearDesc(School school);

        // Find classes by department, grade, academic year for auto-assignment
        List<ClassRoom> findAllBySchoolAndDepartmentAndGradeAndAcademicYearAndStatus(
                        School school,
                        ClassDepartment department,
                        int grade,
                        com.schoolmanagement.backend.domain.entity.admin.AcademicYear academicYear,
                        ClassRoomStatus status);

        // Find all classes by school and status (across all grades/years)
        List<ClassRoom> findAllBySchoolAndStatus(School school, ClassRoomStatus status);

        // Find all active classes for a grade and academic year
        List<ClassRoom> findAllBySchoolAndGradeAndAcademicYearAndStatus(
                        School school,
                        int grade,
                        com.schoolmanagement.backend.domain.entity.admin.AcademicYear academicYear,
                        ClassRoomStatus status);

        Optional<ClassRoom> findByHomeroomTeacher(User homeroomTeacher);

        List<ClassRoom> findAllBySchoolAndHomeroomTeacherIsNotNull(School school);

        // Find classrooms by school and list of grades
        List<ClassRoom> findBySchoolAndGradeIn(School school, List<Integer> grades);

        // --- Methods added for Teacher Portal (fuuko branch) ---

        Optional<ClassRoom> findByHomeroomTeacher_IdAndAcademicYear(UUID teacherId,
                        com.schoolmanagement.backend.domain.entity.admin.AcademicYear academicYear);

        Optional<ClassRoom> findTopByHomeroomTeacher_IdOrderByAcademicYear_StartDateDesc(UUID teacherId);

        @Modifying
        @Query("UPDATE ClassRoom c SET c.homeroomTeacher = null WHERE c.homeroomTeacher.id = :userId")
        void nullifyHomeroomTeacher(@Param("userId") UUID userId);

        boolean existsByCombination(com.schoolmanagement.backend.domain.entity.classes.Combination combination);

        boolean existsByRoomAndAcademicYear(com.schoolmanagement.backend.domain.entity.classes.Room room,
                        com.schoolmanagement.backend.domain.entity.admin.AcademicYear academicYear);

        Optional<ClassRoom> findByRoomAndAcademicYear(com.schoolmanagement.backend.domain.entity.classes.Room room,
                        com.schoolmanagement.backend.domain.entity.admin.AcademicYear academicYear);

        List<ClassRoom> findAllBySchoolAndAcademicYear(School school,
                        com.schoolmanagement.backend.domain.entity.admin.AcademicYear academicYear);

        long countByAcademicYear(com.schoolmanagement.backend.domain.entity.admin.AcademicYear academicYear);

        @Query("SELECT c FROM ClassRoom c LEFT JOIN FETCH c.homeroomTeacher WHERE c.id = :id")
        Optional<ClassRoom> findWithTeacherById(@Param("id") UUID id);
}
