package com.schoolmanagement.backend.repo;

import com.schoolmanagement.backend.domain.entity.ExamRoom;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface ExamRoomRepository extends JpaRepository<ExamRoom, UUID> {
        List<ExamRoom> findByExamScheduleId(UUID examScheduleId);

        @Modifying
        @Query("DELETE FROM ExamRoom er WHERE er.examSchedule.id IN " +
                        "(SELECT esc.id FROM ExamSchedule esc WHERE esc.examSession.id = :sessionId)")
        void deleteBySessionId(@Param("sessionId") UUID sessionId);

        /**
         * Find all exam rooms that are using a specific room during a given time slot.
         * Used for conflict detection.
         */
        @Query("SELECT er FROM ExamRoom er " +
                        "JOIN er.examSchedule es " +
                        "WHERE er.room.id = :roomId " +
                        "AND es.examDate = :examDate " +
                        "AND es.startTime < :endTime " +
                        "AND es.endTime > :startTime")
        List<ExamRoom> findConflictingRooms(
                        @Param("roomId") UUID roomId,
                        @Param("examDate") LocalDate examDate,
                        @Param("startTime") LocalTime startTime,
                        @Param("endTime") LocalTime endTime);
}
