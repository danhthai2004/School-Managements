package com.schoolmanagement.backend.repo;

import com.schoolmanagement.backend.domain.entity.ClassRoom;
import com.schoolmanagement.backend.domain.entity.DailyClassStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface DailyClassStatusRepository extends JpaRepository<DailyClassStatus, UUID> {
    Optional<DailyClassStatus> findByClassRoomAndDate(ClassRoom classRoom, LocalDate date);

    @Modifying
    @Query("UPDATE DailyClassStatus d SET d.finalizedBy = null WHERE d.finalizedBy.id = :userId")
    void nullifyFinalizedBy(@Param("userId") UUID userId);

    void deleteAllByClassRoom(ClassRoom classRoom);
}
