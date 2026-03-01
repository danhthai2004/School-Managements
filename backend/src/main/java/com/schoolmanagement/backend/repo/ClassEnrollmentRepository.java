package com.schoolmanagement.backend.repo;

import com.schoolmanagement.backend.domain.entity.ClassEnrollment;
import com.schoolmanagement.backend.domain.entity.ClassRoom;
import com.schoolmanagement.backend.domain.entity.School;
import com.schoolmanagement.backend.domain.entity.Student;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ClassEnrollmentRepository extends JpaRepository<ClassEnrollment, UUID> {

        List<ClassEnrollment> findAllByStudent(Student student);

        List<ClassEnrollment> findAllByClassRoom(ClassRoom classRoom);

        List<ClassEnrollment> findAllByClassRoomAndAcademicYear(ClassRoom classRoom, String academicYear);

        Optional<ClassEnrollment> findByStudentAndAcademicYear(Student student, String academicYear);

        boolean existsByStudentAndClassRoomAndAcademicYear(Student student, ClassRoom classRoom, String academicYear);

        long countByClassRoom(ClassRoom classRoom);

        void deleteAllByStudent(Student student);

        void deleteByStudentId(UUID studentId);

        void deleteAllByClassRoom(ClassRoom classRoom);

        // Batch load all enrollments for students in a school with class info (N+1 fix)
        @Query("SELECT e FROM ClassEnrollment e " +
                        "JOIN FETCH e.classRoom " +
                        "WHERE e.student.school = :school AND e.academicYear = :academicYear")
        List<ClassEnrollment> findAllByStudentSchoolAndAcademicYear(
                        @Param("school") School school,
                        @Param("academicYear") String academicYear);
}
