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

    /**
     * Create a notification for a specific school (used by School Admin).
     */
    public NotificationDto createForSchool(String title, String message, School school, User createdBy) {
        Notification notification = Notification.builder()
                .title(title)
                .message(message)
                .scope(NotificationScope.SCHOOL)
                .targetSchool(school)
                .createdBy(createdBy)
                .build();

        notification = notifications.save(notification);

        activityLog.log("SCHOOL_NOTIFICATION_CREATED", createdBy, null,
                "School: " + school.getName() + ", Notification: " + notification.getTitle());

        return toDto(notification);
    }

    /**
     * Get all notifications for a specific school (for School Admin management).
     */
    public List<NotificationDto> getForSchool(School school) {
        return notifications.findByTargetSchoolOrderByCreatedAtDesc(school).stream()
                .map(this::toDto)
                .toList();
    }

    /**
     * Get all visible notifications for a user based on their school and role.
     */
    public List<NotificationDto> getVisibleForUser(UUID schoolId, com.schoolmanagement.backend.domain.Role role) {
        return notifications.findVisibleNotifications(schoolId, role).stream()
                .map(this::toDto)
                .toList();
    }

    /**
     * Count recent notifications (last 7 days) for a school.
     */
    public long countRecentForSchool(UUID schoolId) {
        java.time.Instant sevenDaysAgo = java.time.Instant.now().minus(7, java.time.temporal.ChronoUnit.DAYS);
        return notifications.countRecentForSchool(schoolId, sevenDaysAgo);
    }

    /**
     * Count all recent notifications (last 7 days) - for System Admin.
     */
    public long countRecentAll() {
        java.time.Instant sevenDaysAgo = java.time.Instant.now().minus(7, java.time.temporal.ChronoUnit.DAYS);
        return notifications.countRecentAll(sevenDaysAgo);
    }

    /**
     * Get notification by ID.
     * Validates that the notification is visible to the given school.
     */
    public NotificationDto getById(UUID id, UUID schoolId) {
        Notification notification = notifications.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Thông báo không tồn tại."));

        // Check if notification is visible to this school
        boolean isVisible = notification.getScope() == NotificationScope.ALL ||
                (notification.getTargetSchool() != null && notification.getTargetSchool().getId().equals(schoolId));

        if (!isVisible) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Bạn không có quyền xem thông báo này.");
        }

        return toDto(notification);
    }
}
