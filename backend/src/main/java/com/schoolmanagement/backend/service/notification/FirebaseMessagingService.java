package com.schoolmanagement.backend.service.notification;

import com.google.firebase.messaging.*;
import com.schoolmanagement.backend.repo.notification.DeviceTokenRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
public class FirebaseMessagingService {

    private final DeviceTokenRepository deviceTokenRepository;

    public FirebaseMessagingService(DeviceTokenRepository deviceTokenRepository) {
        this.deviceTokenRepository = deviceTokenRepository;
    }

    /**
     * Gửi Push Notification tới nhiều thiết bị, tự động cắt chunk 500 token/lần.
     * Chạy bất đồng bộ `@Async` để không block API chính.
     */
    @Async
    @Transactional
    public void sendMulticast(String title, String content, String actionUrl, List<String> fcmTokens) {
        if (fcmTokens == null || fcmTokens.isEmpty()) {
            return;
        }

        // Firebase Maximum chunk size is 500
        int chunkSize = 500;
        List<List<String>> tokenBatches = new ArrayList<>();
        
        for (int i = 0; i < fcmTokens.size(); i += chunkSize) {
            tokenBatches.add(fcmTokens.subList(i, Math.min(i + chunkSize, fcmTokens.size())));
        }

        List<String> failedTokens = new ArrayList<>();

        for (List<String> batch : tokenBatches) {
            try {
                MulticastMessage.Builder messageBuilder = MulticastMessage.builder()
                        .setNotification(Notification.builder()
                                .setTitle(title)
                                .setBody(content)
                                .build())
                        .addAllTokens(batch);

                if (actionUrl != null && !actionUrl.isBlank()) {
                    messageBuilder.putData("actionUrl", actionUrl); // Đẩy Route Action URL
                }

                BatchResponse response = FirebaseMessaging.getInstance().sendEachForMulticast(messageBuilder.build());
                
                if (response.getFailureCount() > 0) {
                    List<SendResponse> responses = response.getResponses();
                    for (int i = 0; i < responses.size(); i++) {
                        if (!responses.get(i).isSuccessful()) {
                            MessagingErrorCode errorCode = responses.get(i).getException().getMessagingErrorCode();
                            // Xử lý Dead Token
                            if (errorCode == MessagingErrorCode.UNREGISTERED || errorCode == MessagingErrorCode.INVALID_ARGUMENT) {
                                failedTokens.add(batch.get(i));
                            }
                        }
                    }
                }
            } catch (FirebaseMessagingException e) {
                log.error("❌ Lỗi gửi FCM Multicast: {}", e.getMessage(), e);
            }
        }

        // Auto cleanup invalid tokens
        if (!failedTokens.isEmpty()) {
            log.info("🗑️ Dọn dẹp {} FCM Tokens không hợp lệ...", failedTokens.size());
            deviceTokenRepository.deleteAllById(failedTokens);
        }
    }
}
