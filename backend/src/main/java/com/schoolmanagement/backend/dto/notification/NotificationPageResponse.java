package com.schoolmanagement.backend.dto.notification;

import java.util.List;

public record NotificationPageResponse(
        List<NotificationDto> notifications,
        long unreadCount,
        int totalPages,
        long totalElements,
        int currentPage) {
}
