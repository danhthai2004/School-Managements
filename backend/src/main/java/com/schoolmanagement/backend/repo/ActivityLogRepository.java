package com.schoolmanagement.backend.repo;

import com.schoolmanagement.backend.domain.entity.ActivityLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.UUID;

public interface ActivityLogRepository extends JpaRepository<ActivityLog, UUID> {
    Page<ActivityLog> findAllByOrderByCreatedAtDesc(Pageable pageable);

    @Modifying
    @Query("UPDATE ActivityLog a SET a.performedBy = null WHERE a.performedBy.id = :userId")
    void nullifyPerformedBy(@Param("userId") UUID userId);
}
