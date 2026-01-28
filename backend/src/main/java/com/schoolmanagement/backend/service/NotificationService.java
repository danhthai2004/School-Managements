package com.schoolmanagement.backend.service;

import com.schoolmanagement.backend.domain.NotificationScope;
import com.schoolmanagement.backend.domain.entity.Notification;
import com.schoolmanagement.backend.domain.entity.School;
import com.schoolmanagement.backend.domain.entity.User;
import com.schoolmanagement.backend.dto.NotificationDto;
import com.schoolmanagement.backend.dto.request.CreateNotificationRequest;
import com.schoolmanagement.backend.exception.ApiException;
import com.schoolmanagement.backend.repo.NotificationRepository;
import com.schoolmanagement.backend.repo.SchoolRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class NotificationService {

    private final NotificationRepository notifications;
    private final SchoolRepository schools;
    private final ActivityLogService activityLog;

    public NotificationService(NotificationRepository notifications, SchoolRepository schools,
            ActivityLogService activityLog) {
        this.notifications = notifications;
        this.schools = schools;
        this.activityLog = activityLog;
    }

    /**
     * Create a notification with the given scope.
     */
    public NotificationDto create(CreateNotificationRequest req, User createdBy) {
        // Validate scope requirements
        if (req.scope() == NotificationScope.SCHOOL && req.targetSchoolId() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Scope SCHOOL yêu cầu targetSchoolId.");
        }
        if (req.scope() == NotificationScope.ROLE && req.targetRole() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Scope ROLE yêu cầu targetRole.");
        }

        School targetSchool = null;
        if (req.scope() == NotificationScope.SCHOOL) {
            targetSchool = schools.findById(req.targetSchoolId())
                    .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Trường không tồn tại."));
        }

        Notification notification = Notification.builder()
                .title(req.title())
                .message(req.message())
                .scope(req.scope())
                .targetSchool(targetSchool)
                .targetRole(req.scope() == NotificationScope.ROLE ? req.targetRole() : null)
                .createdBy(createdBy)
                .build();

        notification = notifications.save(notification);

        activityLog.log("NOTIFICATION_CREATED", createdBy, null,
                "Notification: " + notification.getTitle() + ", Scope: " + req.scope());

        return toDto(notification);
    }

    /**
     * List all notifications.
     */
    public List<NotificationDto> list() {
        return notifications.findAllByOrderByCreatedAtDesc().stream()
                .map(this::toDto)
                .toList();
    }

    /**
     * Delete a notification.
     */
    public void delete(UUID id, User deletedBy) {
        if (!notifications.existsById(id)) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Thông báo không tồn tại.");
        }
        notifications.deleteById(id);
        activityLog.log("NOTIFICATION_DELETED", deletedBy, null, "Notification ID: " + id);
    }

    private NotificationDto toDto(Notification n) {
        return new NotificationDto(
                n.getId(),
                n.getTitle(),
                n.getMessage(),
                n.getScope(),
                n.getTargetSchool() != null ? n.getTargetSchool().getId() : null,
                n.getTargetSchool() != null ? n.getTargetSchool().getName() : null,
                n.getTargetRole(),
                n.getCreatedBy() != null ? n.getCreatedBy().getEmail() : null,
                n.getCreatedAt());
    }
}
