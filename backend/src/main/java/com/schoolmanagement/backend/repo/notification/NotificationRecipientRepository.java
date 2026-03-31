package com.schoolmanagement.backend.repo.notification;

import com.schoolmanagement.backend.domain.entity.notification.NotificationRecipient;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface NotificationRecipientRepository extends JpaRepository<NotificationRecipient, UUID> {
    
    @Query("SELECT nr FROM NotificationRecipient nr WHERE nr.user.id = :userId AND nr.notification.status = 'ACTIVE' ORDER BY nr.notification.createdAt DESC")
    Page<NotificationRecipient> findByUserIdOrderByCreatedAtDesc(@Param("userId") UUID userId, Pageable pageable);

    @Query("SELECT COUNT(nr) FROM NotificationRecipient nr WHERE nr.user.id = :userId AND nr.isRead = false AND nr.notification.status = 'ACTIVE'")
    long countUnreadByUserId(@Param("userId") UUID userId);

    @Modifying
    @Query("UPDATE NotificationRecipient nr SET nr.isRead = true WHERE nr.user.id = :userId AND nr.isRead = false")
    void markAllAsReadByUserId(@Param("userId") UUID userId);

    Optional<NotificationRecipient> findByIdAndUserId(UUID id, UUID userId);
}
