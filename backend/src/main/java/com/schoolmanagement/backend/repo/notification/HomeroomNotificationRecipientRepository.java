package com.schoolmanagement.backend.repo.notification;

import com.schoolmanagement.backend.domain.entity.notification.HomeroomNotification;
import com.schoolmanagement.backend.domain.entity.notification.HomeroomNotificationRecipient;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface HomeroomNotificationRecipientRepository extends JpaRepository<HomeroomNotificationRecipient, UUID> {

    List<HomeroomNotificationRecipient> findAllByNotification(HomeroomNotification notification);

    int countByNotification(HomeroomNotification notification);

    int countByNotificationAndIsReadTrue(HomeroomNotification notification);

    void deleteAllByNotification(HomeroomNotification notification);
}
