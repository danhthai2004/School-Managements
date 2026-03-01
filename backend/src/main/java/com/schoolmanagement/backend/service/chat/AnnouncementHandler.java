package com.schoolmanagement.backend.service.chat;

import com.schoolmanagement.backend.domain.ChatIntent;
import com.schoolmanagement.backend.domain.NotificationScope;
import com.schoolmanagement.backend.domain.entity.Notification;
import com.schoolmanagement.backend.domain.entity.User;
import com.schoolmanagement.backend.dto.ChatContext;
import com.schoolmanagement.backend.repo.NotificationRepository;
import com.schoolmanagement.backend.repo.UserRepository;
import org.springframework.stereotype.Component;

import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.*;

/**
 * Tầng 5 — Business Handler cho ASK_ANNOUNCEMENT
 *
 * Trả về thông báo gần nhất phù hợp với role của người dùng.
 * Lọc theo: scope (ALL, SCHOOL, ROLE) và targetRole.
 */
@Component
public class AnnouncementHandler implements ChatHandler {

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")
            .withZone(ZoneId.of("Asia/Ho_Chi_Minh"));

    private final UserRepository userRepository;
    private final NotificationRepository notificationRepository;

    public AnnouncementHandler(UserRepository userRepository,
            NotificationRepository notificationRepository) {
        this.userRepository = userRepository;
        this.notificationRepository = notificationRepository;
    }

    @Override
    public ChatContext handle(UUID userId, String message) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng"));

        List<Notification> allNotifications = notificationRepository.findAllByOrderByCreatedAtDesc();

        // Lọc thông báo phù hợp với user
        List<Notification> filtered = allNotifications.stream()
                .filter(n -> isRelevant(n, user))
                .limit(5)
                .toList();

        if (filtered.isEmpty()) {
            return ChatContext.ok(ChatIntent.ASK_ANNOUNCEMENT, Map.of(
                    "message", "Hiện tại không có thông báo mới."));
        }

        List<Map<String, Object>> items = new ArrayList<>();
        for (Notification n : filtered) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("title", n.getTitle());
            item.put("content", n.getMessage());
            item.put("scope", n.getScope() != null ? n.getScope().name() : "");
            item.put("date", DATE_FMT.format(n.getCreatedAt()));
            items.add(item);
        }

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("count", filtered.size());
        data.put("notifications", items);

        return ChatContext.ok(ChatIntent.ASK_ANNOUNCEMENT, data);
    }

    /**
     * Kiểm tra thông báo có liên quan đến user không (dựa trên scope + targetRole).
     */
    private boolean isRelevant(Notification n, User user) {
        if (n.getScope() == NotificationScope.ALL) {
            return true;
        }
        if (n.getScope() == NotificationScope.SCHOOL
                && user.getSchool() != null
                && n.getTargetSchool() != null
                && user.getSchool().getId().equals(n.getTargetSchool().getId())) {
            return true;
        }
        if (n.getScope() == NotificationScope.ROLE
                && n.getTargetRole() == user.getRole()) {
            return true;
        }
        return false;
    }
}
