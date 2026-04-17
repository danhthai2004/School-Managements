package com.schoolmanagement.backend.repo.notification;

import com.schoolmanagement.backend.domain.entity.notification.Notification;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface NotificationRepository extends JpaRepository<Notification, UUID> {
    org.springframework.data.domain.Page<Notification> findAllByOrderByCreatedAtDesc(org.springframework.data.domain.Pageable pageable);

    void deleteByCreatedById(UUID userId);

    org.springframework.data.domain.Page<Notification> findByCreatedByOrderByCreatedAtDesc(
            com.schoolmanagement.backend.domain.entity.auth.User user,
            org.springframework.data.domain.Pageable pageable);
}
