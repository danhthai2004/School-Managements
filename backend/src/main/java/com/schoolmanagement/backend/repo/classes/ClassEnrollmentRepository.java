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

    List<ClassEnrollment> findAllByClassRoomAndAcademicYear(ClassRoom classRoom, String academicYear);

    Optional<ClassEnrollment> findTopByStudentAndAcademicYearOrderByEnrolledAtDesc(Student student,
            String academicYear);

    boolean existsByStudentAndClassRoomAndAcademicYear(Student student, ClassRoom classRoom, String academicYear);

    long countByClassRoom(ClassRoom classRoom);

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
            @Param("academicYear") String academicYear);
}
