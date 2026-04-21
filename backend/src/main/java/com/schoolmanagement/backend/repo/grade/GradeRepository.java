package com.schoolmanagement.backend.repo.grade;

import com.schoolmanagement.backend.domain.entity.classes.ClassRoom;
import com.schoolmanagement.backend.domain.entity.grade.Grade;
import com.schoolmanagement.backend.domain.entity.admin.School;
import com.schoolmanagement.backend.domain.entity.student.Student;
import com.schoolmanagement.backend.domain.entity.classes.Subject;
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

        List<Grade> findAllByStudentAndSemester(Student student,
                        com.schoolmanagement.backend.domain.entity.admin.Semester semester);

        boolean existsByStudent(Student student);

        @Modifying
        @Query("DELETE FROM Grade e WHERE e.student = :student")
        void deleteAllByStudent(@Param("student") Student student);

        @org.springframework.data.jpa.repository.EntityGraph(attributePaths = { "student" })
        List<Grade> findAllByClassRoomAndSemester(ClassRoom classRoom,
                        com.schoolmanagement.backend.domain.entity.admin.Semester semester);

        @org.springframework.data.jpa.repository.EntityGraph(attributePaths = { "student", "regularScores" })
        List<Grade> findAllByClassRoomAndSubjectAndSemester(ClassRoom classRoom, Subject subject,
                        com.schoolmanagement.backend.domain.entity.admin.Semester semester);

        List<Grade> findAllBySubject(Subject subject);

        @Query("SELECT g FROM Grade g WHERE g.classRoom.school = :school")
        List<Grade> findAllBySchool(@Param("school") School school);

        @Query("SELECT g FROM Grade g WHERE g.classRoom.school = :school AND g.semester.academicYear = :academicYear")
        List<Grade> findAllBySchoolAndAcademicYear(@Param("school") School school,
                        @Param("academicYear") com.schoolmanagement.backend.domain.entity.admin.AcademicYear academicYear);

        @org.springframework.data.jpa.repository.EntityGraph(attributePaths = { "student", "subject", "classRoom" })
        @Query("SELECT g FROM Grade g WHERE g.classRoom.school = :school AND g.semester = :semester")
        List<Grade> findAllBySchoolAndSemester(
                        @Param("school") School school,
                        @Param("semester") com.schoolmanagement.backend.domain.entity.admin.Semester semester);

        long countByClassRoom(ClassRoom classRoom);

        List<Grade> findAllByTeacher(com.schoolmanagement.backend.domain.entity.teacher.Teacher teacher);

        @Modifying
        @Query("DELETE FROM Grade e WHERE e.teacher = :teacher")
        void deleteAllByTeacher(@Param("teacher") com.schoolmanagement.backend.domain.entity.teacher.Teacher teacher);

        boolean existsByTeacher(com.schoolmanagement.backend.domain.entity.teacher.Teacher teacher);

        @Modifying
        @Query("DELETE FROM Grade g WHERE g.student.id = :studentId")
        void deleteByStudentId(@Param("studentId") UUID studentId);
}
