package com.schoolmanagement.backend.repo.notification;

import com.schoolmanagement.backend.domain.entity.notification.Notification;
<<<<<<< HEAD
import com.schoolmanagement.backend.domain.notification.NotificationStatus;
import com.schoolmanagement.backend.domain.notification.NotificationType;
import com.schoolmanagement.backend.domain.notification.TargetGroup;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
=======
import org.springframework.data.jpa.repository.JpaRepository;
>>>>>>> c19d40b (fix: merging module sa&teacher)

import java.util.UUID;

public interface NotificationRepository extends JpaRepository<Notification, UUID> {
    org.springframework.data.domain.Page<Notification> findAllByOrderByCreatedAtDesc(org.springframework.data.domain.Pageable pageable);

<<<<<<< HEAD
    Page<Notification> findByCreatedByOrderByCreatedAtDesc(User createdBy, Pageable pageable);

    @Query("SELECT n FROM Notification n WHERE " +
            "(:type IS NULL OR n.type = :type) AND " +
            "(:targetGroup IS NULL OR n.targetGroup = :targetGroup) AND " +
            "(:status IS NULL OR n.status = :status) AND " +
            "(:search IS NULL OR :search = '' OR LOWER(n.title) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(n.content) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<Notification> findAllWithFilters(
            @Param("type") NotificationType type,
            @Param("targetGroup") TargetGroup targetGroup,
            @Param("status") NotificationStatus status,
            @Param("search") String search,
            Pageable pageable);
=======
    void deleteByCreatedById(UUID userId);

    org.springframework.data.domain.Page<Notification> findByCreatedByOrderByCreatedAtDesc(
            com.schoolmanagement.backend.domain.entity.auth.User user,
            org.springframework.data.domain.Pageable pageable);
>>>>>>> c19d40b (fix: merging module sa&teacher)
}
