package com.schoolmanagement.backend.repo;

import com.schoolmanagement.backend.domain.entity.ClassRoom;
import com.schoolmanagement.backend.domain.entity.Timetable;
import com.schoolmanagement.backend.domain.entity.TimetableDetail;
import com.schoolmanagement.backend.domain.entity.Teacher;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.DayOfWeek;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TimetableDetailRepository extends JpaRepository<TimetableDetail, UUID> {
        List<TimetableDetail> findAllByTimetable(Timetable timetable);

        List<TimetableDetail> findAllByTimetableAndClassRoom(Timetable timetable, ClassRoom classRoom);

        List<TimetableDetail> findAllByTimetableAndTeacher(Timetable timetable, Teacher teacher);

        // Check conflicts
        boolean existsByTimetableAndTeacherAndDayOfWeekAndSlotIndex(Timetable timetable, Teacher teacher,
                        DayOfWeek dayOfWeek,
                        int slotIndex);

        boolean existsByTimetableAndClassRoomAndDayOfWeekAndSlotIndex(Timetable timetable, ClassRoom classRoom,
                        DayOfWeek dayOfWeek, int slotIndex);

        // ID-based checks for Performance & Service compatibility
        boolean existsByTimetableIdAndTeacherIdAndDayOfWeekAndSlotIndex(UUID timetableId, UUID teacherId,
                        DayOfWeek dayOfWeek, int slotIndex);

        boolean existsByTimetableIdAndClassRoomIdAndDayOfWeekAndSlotIndex(UUID timetableId, UUID classRoomId,
                        DayOfWeek dayOfWeek, int slotIndex);

        long countByTimetableIdAndClassRoomIdAndSubjectIdAndDayOfWeek(UUID timetableId, UUID classRoomId,
                        UUID subjectId, DayOfWeek dayOfWeek);

        void deleteByTimetable(Timetable timetable);

        long countByTimetableAndClassRoomAndSubject(Timetable timetable,
                        com.schoolmanagement.backend.domain.entity.ClassRoom classRoom,
                        com.schoolmanagement.backend.domain.entity.Subject subject);

        java.util.Optional<TimetableDetail> findByTimetableAndClassRoomAndDayOfWeekAndSlotIndex(Timetable timetable,
                        com.schoolmanagement.backend.domain.entity.ClassRoom classRoom, java.time.DayOfWeek dayOfWeek,
                        int slotIndex);

        @org.springframework.data.jpa.repository.Modifying
        @org.springframework.data.jpa.repository.Query("UPDATE TimetableDetail t SET t.teacher = null WHERE t.teacher = :teacher")
        void unlinkTeacherFromTimetable(@org.springframework.data.repository.query.Param("teacher") Teacher teacher);

        boolean existsByTeacher(Teacher teacher);
}
