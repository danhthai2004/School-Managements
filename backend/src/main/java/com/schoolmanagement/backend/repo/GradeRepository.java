package com.schoolmanagement.backend.repo;

import com.schoolmanagement.backend.domain.entity.ClassRoom;
import com.schoolmanagement.backend.domain.entity.Grade;
import com.schoolmanagement.backend.domain.entity.School;
import com.schoolmanagement.backend.domain.entity.Student;
import com.schoolmanagement.backend.domain.entity.Subject;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface GradeRepository extends JpaRepository<Grade, UUID> {

        List<Grade> findAllByStudent(Student student);

        @Modifying
        @Query("DELETE FROM Grade e WHERE e.student = :student")
        void deleteAllByStudent(@Param("student") Student student);

        List<Grade> findAllByClassRoom(ClassRoom classRoom);

        List<Grade> findAllByClassRoomAndSemester(ClassRoom classRoom, int semester);

        List<Grade> findAllBySubject(Subject subject);

        @Query("SELECT g FROM Grade g WHERE g.classRoom.school = :school")
        List<Grade> findAllBySchool(@Param("school") School school);

        @Query("SELECT g FROM Grade g WHERE g.classRoom.school = :school AND g.academicYear = :academicYear")
        List<Grade> findAllBySchoolAndAcademicYear(@Param("school") School school,
                        @Param("academicYear") String academicYear);

        @Query("SELECT g FROM Grade g WHERE g.classRoom.school = :school AND g.academicYear = :academicYear AND g.semester = :semester")
        List<Grade> findAllBySchoolAndAcademicYearAndSemester(
                        @Param("school") School school,
                        @Param("academicYear") String academicYear,
                        @Param("semester") int semester);

        long countByClassRoom(ClassRoom classRoom);

        List<Grade> findAllByTeacher(com.schoolmanagement.backend.domain.entity.Teacher teacher);

        @Modifying
        @Query("DELETE FROM Grade e WHERE e.teacher = :teacher")
        void deleteAllByTeacher(@Param("teacher") com.schoolmanagement.backend.domain.entity.Teacher teacher);
}
