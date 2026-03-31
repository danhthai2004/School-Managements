package com.schoolmanagement.backend.dto.notification;

import jakarta.validation.constraints.NotBlank;

public record DeviceTokenRequest(
        @NotBlank String fcmToken,
        String deviceType // ANDROID_WEB, DESKTOP_WEB
) {
}
