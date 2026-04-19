package com.schoolmanagement.backend.repo.notification;

import com.schoolmanagement.backend.domain.entity.auth.User;
import com.schoolmanagement.backend.domain.entity.notification.Notification;
import com.schoolmanagement.backend.domain.notification.NotificationStatus;
import com.schoolmanagement.backend.domain.notification.NotificationType;
import com.schoolmanagement.backend.domain.notification.TargetGroup;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.UUID;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, UUID> {
    Page<Notification> findAllByOrderByCreatedAtDesc(Pageable pageable);

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

    void deleteByCreatedById(UUID userId);
}
