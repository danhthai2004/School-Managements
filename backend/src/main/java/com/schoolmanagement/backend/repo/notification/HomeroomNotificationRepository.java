package com.schoolmanagement.backend.repo.notification;

import com.schoolmanagement.backend.domain.entity.classes.ClassRoom;
import com.schoolmanagement.backend.domain.entity.notification.HomeroomNotification;
import com.schoolmanagement.backend.domain.entity.auth.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface HomeroomNotificationRepository extends JpaRepository<HomeroomNotification, UUID> {

    List<HomeroomNotification> findAllByCreatedByOrderByCreatedAtDesc(User createdBy);

    List<HomeroomNotification> findAllByClassRoomOrderByCreatedAtDesc(ClassRoom classRoom);
}
