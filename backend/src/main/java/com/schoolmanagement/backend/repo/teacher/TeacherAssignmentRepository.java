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

    List<TeacherAssignment> findAllByClassRoom(ClassRoom classRoom);

    List<TeacherAssignment> findAllByTeacher(com.schoolmanagement.backend.domain.entity.teacher.Teacher teacher);

    Optional<TeacherAssignment> findFirstByClassRoomAndSubject(ClassRoom classRoom,
            com.schoolmanagement.backend.domain.entity.classes.Subject subject);

    Optional<TeacherAssignment> findFirstByClassRoomAndSubjectAndTeacherIsNotNull(ClassRoom classRoom,
            com.schoolmanagement.backend.domain.entity.classes.Subject subject);

    void deleteAllByTeacher(com.schoolmanagement.backend.domain.entity.teacher.Teacher teacher);

    boolean existsByTeacher(com.schoolmanagement.backend.domain.entity.teacher.Teacher teacher);

    void deleteByTeacherId(UUID teacherId);

    List<TeacherAssignment> findAllBySubjectAndSchool(com.schoolmanagement.backend.domain.entity.classes.Subject subject, School school);
}