package com.schoolmanagement.backend.service.common;

import com.schoolmanagement.backend.service.chat.ChatHandler;

import com.schoolmanagement.backend.domain.chat.ChatIntent;
import com.schoolmanagement.backend.domain.entity.notification.Notification;
import com.schoolmanagement.backend.domain.entity.notification.NotificationRecipient;
import com.schoolmanagement.backend.dto.chat.ChatContext;
import com.schoolmanagement.backend.repo.notification.NotificationRecipientRepository;
import com.schoolmanagement.backend.repo.auth.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Component;

import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.*;

/**
 * Tầng 5 — Business Handler cho ASK_ANNOUNCEMENT
 *
 * Trả về thông báo gần nhất phù hợp với user (dựa trên bảng notification_recipients).
 */
@Component
public class AnnouncementHandler implements ChatHandler {

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")
            .withZone(ZoneId.of("Asia/Ho_Chi_Minh"));

    private final UserRepository userRepository;
    private final NotificationRecipientRepository recipientRepository;

    public AnnouncementHandler(UserRepository userRepository,
            NotificationRecipientRepository recipientRepository) {
        this.userRepository = userRepository;
        this.recipientRepository = recipientRepository;
    }

    @Override
    public ChatContext handle(UUID userId, String message) {
        userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng"));

        // Lấy 5 thông báo cá nhân gần nhất (chỉ ACTIVE)
        Page<NotificationRecipient> page = recipientRepository
                .findByUserIdOrderByCreatedAtDesc(userId, PageRequest.of(0, 5));

        List<NotificationRecipient> filtered = page.getContent();

        if (filtered.isEmpty()) {
            return ChatContext.ok(ChatIntent.ASK_ANNOUNCEMENT, Map.of(
                    "message", "Hiện tại không có thông báo mới."));
        }

        List<Map<String, Object>> items = new ArrayList<>();
        for (NotificationRecipient nr : filtered) {
            Notification n = nr.getNotification();
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("title", n.getTitle());
            item.put("content", n.getContent());
            item.put("type", n.getType().name());
            item.put("isRead", nr.isRead());
            item.put("date", DATE_FMT.format(n.getCreatedAt()));
            items.add(item);
        }

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("count", filtered.size());
        data.put("notifications", items);

        return ChatContext.ok(ChatIntent.ASK_ANNOUNCEMENT, data);
    }
}
