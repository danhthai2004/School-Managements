package com.schoolmanagement.backend.repo;

import com.schoolmanagement.backend.domain.entity.ActivityLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface ActivityLogRepository extends JpaRepository<ActivityLog, UUID> {
    Page<ActivityLog> findAllByOrderByCreatedAtDesc(Pageable pageable);
}
