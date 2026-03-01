package com.schoolmanagement.backend.repo;

import com.schoolmanagement.backend.domain.entity.ClassRoom;
import com.schoolmanagement.backend.domain.entity.Timetable;
import com.schoolmanagement.backend.domain.entity.TimetableDetail;
import com.schoolmanagement.backend.domain.entity.Teacher;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
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

        // Replace full delete with partial delete support
        void deleteByTimetable(Timetable timetable);

        void deleteByTimetableAndIsFixedFalse(Timetable timetable);

        long countByTimetableAndClassRoomAndSubject(Timetable timetable,
                        com.schoolmanagement.backend.domain.entity.ClassRoom classRoom,
                        com.schoolmanagement.backend.domain.entity.Subject subject);

        java.util.Optional<TimetableDetail> findByTimetableAndClassRoomAndDayOfWeekAndSlotIndex(Timetable timetable,
                        com.schoolmanagement.backend.domain.entity.ClassRoom classRoom, java.time.DayOfWeek dayOfWeek,
                        int slotIndex);

        java.util.Optional<TimetableDetail> findByTimetableAndTeacherAndDayOfWeekAndSlotIndex(Timetable timetable,
                        Teacher teacher, java.time.DayOfWeek dayOfWeek, int slotIndex);

        void deleteByTeacherId(UUID teacherId);

        @Modifying
        @Query("UPDATE TimetableDetail td SET td.teacher = null WHERE td.teacher.id = :teacherId")
        void nullifyTeacherId(@Param("teacherId") UUID teacherId);

        /**
         * Check if a teacher teaches a specific subject in a specific class
         * (used for grading permission check).
         */
        boolean existsByTimetable_StatusAndTeacher_User_IdAndClassRoom_IdAndSubject_Id(
                        com.schoolmanagement.backend.domain.TimetableStatus status,
                        UUID teacherUserId, UUID classRoomId, UUID subjectId);

        void deleteAllByClassRoom(com.schoolmanagement.backend.domain.entity.ClassRoom classRoom);
}
