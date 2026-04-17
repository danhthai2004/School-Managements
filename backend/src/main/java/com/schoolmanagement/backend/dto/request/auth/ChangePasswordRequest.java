package com.schoolmanagement.backend.dto.request.auth;

import jakarta.validation.constraints.NotBlank;

public record ChangePasswordRequest(
        @NotBlank(message = "Mật khẩu hiện tại không được để trống")
        String currentPassword,
        
        @NotBlank(message = "Mật khẩu mới không được để trống")
        String newPassword
) {}
