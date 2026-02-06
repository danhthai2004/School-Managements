package com.schoolmanagement.backend.repo;

import com.schoolmanagement.backend.domain.entity.AttendanceSession;
import com.schoolmanagement.backend.domain.entity.ClassRoom;
import com.schoolmanagement.backend.domain.entity.School;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Repository
public interface AttendanceSessionRepository extends JpaRepository<AttendanceSession, UUID> {

    List<AttendanceSession> findAllBySchool(School school);

    List<AttendanceSession> findAllBySchoolAndAcademicYear(School school, String academicYear);

    List<AttendanceSession> findAllByClassRoom(ClassRoom classRoom);

    List<AttendanceSession> findAllByClassRoomAndAcademicYear(ClassRoom classRoom, String academicYear);

    List<AttendanceSession> findAllBySchoolAndSessionDateBetween(School school, LocalDate startDate, LocalDate endDate);

    long countBySchool(School school);

    long countByClassRoom(ClassRoom classRoom);
}
