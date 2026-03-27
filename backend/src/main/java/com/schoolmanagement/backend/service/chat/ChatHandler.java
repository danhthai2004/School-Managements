package com.schoolmanagement.backend.service.chat;

import com.schoolmanagement.backend.dto.chat.ChatContext;

import java.util.UUID;

/**
 * Interface cho tất cả Chat Handler.
 * Mỗi handler xử lý MỘT loại ý định (intent) cụ thể.
 *
 * Nhiệm vụ của handler:
 * 1. Kiểm tra quyền (ownership check)
 * 2. Truy vấn Database
 * 3. Trả về ChatContext chứa dữ liệu thô
 *
 * Handler KHÔNG gọi AI, KHÔNG sinh câu trả lời tự nhiên.
 */
public interface ChatHandler {

    /**
     * Xử lý intent và trả về context chứa dữ liệu thô.
     *
     * @param userId  UUID của user đang đăng nhập (lấy từ JWT)
     * @param message Tin nhắn gốc của người dùng (dùng để trích xuất thêm thông tin
     *                nếu cần)
     * @return ChatContext chứa dữ liệu thô hoặc trạng thái lỗi
     */
    ChatContext handle(UUID userId, String message);
}
