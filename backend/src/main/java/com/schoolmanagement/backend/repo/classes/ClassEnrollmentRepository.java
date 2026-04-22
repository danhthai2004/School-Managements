package com.schoolmanagement.backend.repo.classes;

import com.schoolmanagement.backend.domain.entity.classes.ClassEnrollment;
import com.schoolmanagement.backend.domain.entity.classes.ClassRoom;
import com.schoolmanagement.backend.domain.entity.student.Student;
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

    @Query("SELECT ce FROM ClassEnrollment ce JOIN FETCH ce.student s LEFT JOIN FETCH s.guardian WHERE ce.classRoom = :classRoom")
    List<ClassEnrollment> findAllByClassRoomWithStudentAndGuardian(@Param("classRoom") ClassRoom classRoom);

    List<ClassEnrollment> findAllByClassRoomAndAcademicYear(ClassRoom classRoom,
            com.schoolmanagement.backend.domain.entity.admin.AcademicYear academicYear);

    Optional<ClassEnrollment> findTopByStudentAndAcademicYearOrderByEnrolledAtDesc(Student student,
            com.schoolmanagement.backend.domain.entity.admin.AcademicYear academicYear);

    boolean existsByStudentAndClassRoomAndAcademicYear(Student student, ClassRoom classRoom,
            com.schoolmanagement.backend.domain.entity.admin.AcademicYear academicYear);

    long countByClassRoom(ClassRoom classRoom);

    @Query("SELECT ce.classRoom.id, COUNT(ce) FROM ClassEnrollment ce WHERE ce.classRoom IN :classes GROUP BY ce.classRoom.id")
    List<Object[]> countByClassRoomIn(@Param("classes") List<ClassRoom> classes);

    @org.springframework.data.jpa.repository.Modifying
    @Query("DELETE FROM ClassEnrollment c WHERE c.student = :student")
    void deleteAllByStudent(@Param("student") Student student);

    @Query("""
                select ce.classRoom.id
                from ClassEnrollment ce
                where ce.student.id = :studentId
                and ce.academicYear = :academicYear
                order by ce.enrolledAt desc
            """)
    List<UUID> findLatestClassroomId(
            @Param("studentId") UUID studentId,
            @Param("academicYear") com.schoolmanagement.backend.domain.entity.admin.AcademicYear academicYear);

    long countByAcademicYear(com.schoolmanagement.backend.domain.entity.admin.AcademicYear academicYear);

    /**
     * Batch-fetch enrollments for multiple students in one query (fixes N+1).
     * JOIN FETCH ensures classRoom is loaded eagerly.
     */
    @Query("""
                SELECT ce FROM ClassEnrollment ce
                JOIN FETCH ce.classRoom
                WHERE ce.student IN :students
                AND ce.academicYear = :academicYear
                ORDER BY ce.enrolledAt DESC
            """)
    List<ClassEnrollment> findAllByStudentInAndAcademicYear(
            @Param("students") List<Student> students,
            @Param("academicYear") com.schoolmanagement.backend.domain.entity.admin.AcademicYear academicYear);

    @org.springframework.data.jpa.repository.Modifying
    @Query("DELETE FROM ClassEnrollment c WHERE c.student.id = :studentId")
    void deleteByStudentId(@Param("studentId") UUID studentId);
}
