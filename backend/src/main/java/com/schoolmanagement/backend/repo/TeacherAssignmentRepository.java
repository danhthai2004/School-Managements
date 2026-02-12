package com.schoolmanagement.backend.repo;

import com.schoolmanagement.backend.domain.entity.ClassRoom;
import com.schoolmanagement.backend.domain.entity.School;
import com.schoolmanagement.backend.domain.entity.TeacherAssignment;
import com.schoolmanagement.backend.domain.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TeacherAssignmentRepository extends JpaRepository<TeacherAssignment, UUID> {
    List<TeacherAssignment> findAllBySchool(School school);

    List<TeacherAssignment> findAllByClassRoom(ClassRoom classRoom);

    List<TeacherAssignment> findAllByTeacher(User teacher);

    Optional<TeacherAssignment> findByClassRoomAndSubject(ClassRoom classRoom,
            com.schoolmanagement.backend.domain.entity.Subject subject);

    void deleteAllByTeacher(com.schoolmanagement.backend.domain.entity.Teacher teacher);
}
