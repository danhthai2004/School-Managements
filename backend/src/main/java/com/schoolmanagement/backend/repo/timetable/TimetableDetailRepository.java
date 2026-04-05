package com.schoolmanagement.backend.repo.timetable;

import com.schoolmanagement.backend.domain.entity.classes.ClassRoom;
import com.schoolmanagement.backend.domain.entity.timetable.Timetable;
import com.schoolmanagement.backend.domain.entity.timetable.TimetableDetail;
import com.schoolmanagement.backend.domain.entity.teacher.Teacher;
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

        void deleteByTimetable(Timetable timetable);

        long countByTimetableAndClassRoomAndSubject(Timetable timetable,
                        com.schoolmanagement.backend.domain.entity.classes.ClassRoom classRoom,
                        com.schoolmanagement.backend.domain.entity.classes.Subject subject);

        Optional<TimetableDetail> findByTimetableAndClassRoomAndDayOfWeekAndSlotIndex(Timetable timetable,
                        com.schoolmanagement.backend.domain.entity.classes.ClassRoom classRoom, java.time.DayOfWeek dayOfWeek,
                        int slotIndex);

        @Modifying
        @Query("UPDATE TimetableDetail t SET t.teacher = null WHERE t.teacher = :teacher")
        void unlinkTeacherFromTimetable(@Param("teacher") Teacher teacher);

        boolean existsByTeacher(Teacher teacher);

        List<TimetableDetail> findByClassRoom(ClassRoom classRoom);

        // --- Method added for Teacher Portal (fuuko branch) ---

        Optional<TimetableDetail> findByTimetableAndTeacherAndDayOfWeekAndSlotIndex(
                        Timetable timetable, Teacher teacher, DayOfWeek dayOfWeek, int slotIndex);

        @Modifying
        @Query("UPDATE TimetableDetail t SET t.teacher = null WHERE t.teacher.id = :teacherId")
        void nullifyTeacherId(@Param("teacherId") UUID teacherId);

        List<TimetableDetail> findAllByTimetableAndDayOfWeek(Timetable timetable, DayOfWeek dayOfWeek);
}
