package com.schoolmanagement.backend.repo.attendance;

import com.schoolmanagement.backend.domain.entity.attendance.AttendanceSession;
import com.schoolmanagement.backend.domain.entity.classes.ClassRoom;
import com.schoolmanagement.backend.domain.entity.admin.School;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Repository
public interface AttendanceSessionRepository extends JpaRepository<AttendanceSession, UUID> {

    List<AttendanceSession> findAllBySchool(School school);

    List<AttendanceSession> findAllByClassRoom(ClassRoom classRoom);

    List<AttendanceSession> findAllBySchoolAndSessionDateBetween(School school, LocalDate startDate, LocalDate endDate);

    long countBySchool(School school);

    long countByClassRoom(ClassRoom classRoom);

    List<com.schoolmanagement.backend.domain.entity.attendance.AttendanceSession> findAllByTeacher(
            com.schoolmanagement.backend.domain.entity.teacher.Teacher teacher);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("DELETE FROM AttendanceSession e WHERE e.teacher = :teacher")
    void deleteAllByTeacher(
            @org.springframework.data.repository.query.Param("teacher") com.schoolmanagement.backend.domain.entity.teacher.Teacher teacher);

    long countByAcademicYear(com.schoolmanagement.backend.domain.entity.admin.AcademicYear academicYear);
}
