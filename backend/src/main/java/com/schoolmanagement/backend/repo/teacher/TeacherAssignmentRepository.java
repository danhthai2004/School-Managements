package com.schoolmanagement.backend.repo.teacher;

import com.schoolmanagement.backend.domain.entity.classes.ClassRoom;
import com.schoolmanagement.backend.domain.entity.admin.School;
import com.schoolmanagement.backend.domain.entity.teacher.TeacherAssignment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TeacherAssignmentRepository extends JpaRepository<TeacherAssignment, UUID> {
        List<TeacherAssignment> findAllBySchool(School school);

        @org.springframework.data.jpa.repository.Query("SELECT ta FROM TeacherAssignment ta " +
                        "LEFT JOIN FETCH ta.teacher t " +
                        "LEFT JOIN FETCH ta.subject s " +
                        "LEFT JOIN FETCH ta.classRoom c " +
                        "WHERE ta.school = :school")
        List<TeacherAssignment> findAllBySchoolWithDetails(
                        @org.springframework.data.repository.query.Param("school") School school);

        List<TeacherAssignment> findAllByClassRoom(ClassRoom classRoom);

        List<TeacherAssignment> findAllByTeacher(com.schoolmanagement.backend.domain.entity.teacher.Teacher teacher);

        void deleteAllByClassRoom(ClassRoom classRoom);

        Optional<TeacherAssignment> findByClassRoomAndSubject(ClassRoom classRoom,
                        com.schoolmanagement.backend.domain.entity.classes.Subject subject);

        Optional<TeacherAssignment> findFirstByClassRoomAndSubject(ClassRoom classRoom,
                        com.schoolmanagement.backend.domain.entity.classes.Subject subject);

        Optional<TeacherAssignment> findFirstByClassRoomAndSubjectAndTeacherIsNotNull(ClassRoom classRoom,
                        com.schoolmanagement.backend.domain.entity.classes.Subject subject);

        void deleteAllByTeacher(com.schoolmanagement.backend.domain.entity.teacher.Teacher teacher);

        boolean existsByTeacher(com.schoolmanagement.backend.domain.entity.teacher.Teacher teacher);

        void deleteByTeacherId(UUID teacherId);

        long countByTeacher(com.schoolmanagement.backend.domain.entity.teacher.Teacher teacher);
}