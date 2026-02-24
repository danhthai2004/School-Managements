package com.schoolmanagement.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * DTO cho request gửi tin nhắn chat.
 *
 * @param message Nội dung tin nhắn của người dùng
 */
public record ChatRequest(
        @NotBlank(message = "Tin nhắn không được để trống") @Size(max = 1000, message = "Tin nhắn không được vượt quá 1000 ký tự") String message) {
}
