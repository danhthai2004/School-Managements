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

        @Modifying
        @Query("UPDATE TimetableDetail t SET t.teacher = :teacher WHERE t.classRoom = :classRoom AND t.subject = :subject")
        void updateTeacherForClassAndSubject(@Param("classRoom") ClassRoom classRoom, @Param("subject") com.schoolmanagement.backend.domain.entity.classes.Subject subject, @Param("teacher") Teacher teacher);

        boolean existsByTeacher(Teacher teacher);

        List<TimetableDetail> findByClassRoom(ClassRoom classRoom);

        // --- Method added for Teacher Portal (fuuko branch) ---

        Optional<TimetableDetail> findByTimetableAndTeacherAndDayOfWeekAndSlotIndex(
                        Timetable timetable, Teacher teacher, DayOfWeek dayOfWeek, int slotIndex);

        @Modifying
        @Query("UPDATE TimetableDetail t SET t.teacher = null WHERE t.teacher.id = :teacherId")
        void nullifyTeacherId(@Param("teacherId") UUID teacherId);

        List<TimetableDetail> findAllByTimetableAndDayOfWeek(Timetable timetable, DayOfWeek dayOfWeek);

        List<TimetableDetail> findAllByTimetableAndClassRoomAndDayOfWeek(Timetable timetable, ClassRoom classRoom, DayOfWeek dayOfWeek);

        void deleteByTimetableAndIsFixedFalse(Timetable timetable);

        void deleteByTeacherId(UUID teacherId);

        boolean existsByTimetable_StatusAndTeacher_User_IdAndClassRoom_IdAndSubject_Id(
                        com.schoolmanagement.backend.domain.timetable.TimetableStatus status,
                        UUID teacherUserId, UUID classRoomId, UUID subjectId);

        void deleteAllByClassRoom(ClassRoom classRoom);

        @Query("SELECT DISTINCT td FROM TimetableDetail td " +
                        "JOIN FETCH td.classRoom " +
                        "JOIN FETCH td.subject " +
                        "WHERE td.teacher.user.id = :userId " +
                        "AND td.timetable.status = com.schoolmanagement.backend.domain.timetable.TimetableStatus.OFFICIAL")
        List<TimetableDetail> findDistinctAssignmentsByTeacherUserId(@Param("userId") UUID userId);

        @Query("SELECT DISTINCT td.subject FROM TimetableDetail td " +
                        "WHERE td.classRoom.id = :classRoomId " +
                        "AND td.timetable.status = com.schoolmanagement.backend.domain.timetable.TimetableStatus.OFFICIAL")
        List<com.schoolmanagement.backend.domain.entity.classes.Subject> findDistinctSubjectsByClassRoomId(
                        @Param("classRoomId") UUID classRoomId);
}
