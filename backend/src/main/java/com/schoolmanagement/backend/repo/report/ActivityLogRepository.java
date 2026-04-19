package com.schoolmanagement.backend.repo.report;

import com.schoolmanagement.backend.domain.entity.report.ActivityLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.Modifying;

public interface ActivityLogRepository extends JpaRepository<ActivityLog, UUID> {
    Page<ActivityLog> findAllByOrderByCreatedAtDesc(Pageable pageable);
    @Modifying
    @Query("UPDATE ActivityLog a SET a.performedBy = null WHERE a.performedBy.id = :userId")
    void nullifyPerformedBy(@Param("userId") UUID userId);
}
