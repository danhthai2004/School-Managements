package com.schoolmanagement.backend.repo;

import com.schoolmanagement.backend.domain.entity.Attendance;
import com.schoolmanagement.backend.domain.entity.ClassRoom;
import com.schoolmanagement.backend.domain.entity.Student;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AttendanceRepository extends JpaRepository<Attendance, UUID> {
    List<Attendance> findAllByClassRoomAndDateAndSlotIndex(ClassRoom classRoom, LocalDate date, int slotIndex);

    List<Attendance> findAllByStudentAndDate(Student student, LocalDate date);

    List<Attendance> findAllByClassRoomAndDate(ClassRoom classRoom, LocalDate date);

    Optional<Attendance> findByStudentAndDateAndSlotIndex(Student student, LocalDate date, int slotIndex);

    void deleteByTeacherId(UUID teacherId);

    @Modifying
    @Query("UPDATE Attendance a SET a.teacher = null WHERE a.teacher.id = :teacherId")
    void nullifyTeacherId(@Param("teacherId") UUID teacherId);

    void deleteByStudentId(UUID studentId);

    List<Attendance> findAllByStudentId(UUID studentId);

    List<Attendance> findAllByClassRoomAndDateBetween(ClassRoom classRoom, LocalDate startDate, LocalDate endDate);

    List<Attendance> findAllByStudentIdAndDateBetween(UUID studentId, LocalDate startDate, LocalDate endDate);

    @Modifying
    @Query("UPDATE Attendance a SET a.classRoom = null WHERE a.classRoom.id = :classRoomId")
    void nullifyClassRoomId(@Param("classRoomId") UUID classRoomId);
}
