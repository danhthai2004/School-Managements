package com.schoolmanagement.backend.dto.chat;

import com.schoolmanagement.backend.domain.chat.ChatIntent;

import java.util.List;
import java.util.Map;

/**
 * Đối tượng ngữ cảnh (Context Object) mang dữ liệu thô từ Business Handler
 * để truyền cho NLG (AI) diễn đạt thành câu trả lời tự nhiên.
 *
 * AI CHỈ được đọc dữ liệu từ đối tượng này — KHÔNG được tự query DB.
 */
public record ChatContext(
        /** Ý định đã phân loại */
        ChatIntent intent,

        /** Trạng thái: OK, NEED_CLARIFICATION, DENIED, ERROR */
        String status,

        /** Dữ liệu thô từ DB (key-value tùy theo intent) */
        Map<String, Object> data,

        /** Danh sách tên học sinh (dùng khi NEED_CLARIFICATION cho Guardian) */
        List<String> studentNames,

        /** Thông báo lỗi hoặc từ chối (nếu có) */
        String errorMessage) {
    /** Tạo context thành công với dữ liệu */
    public static ChatContext ok(ChatIntent intent, Map<String, Object> data) {
        return new ChatContext(intent, "OK", data, null, null);
    }

    /** Tạo context yêu cầu làm rõ (Guardian có nhiều con) */
    public static ChatContext needClarification(ChatIntent intent, List<String> studentNames) {
        return new ChatContext(intent, "NEED_CLARIFICATION", null, studentNames, null);
    }

    /** Tạo context từ chối */
    public static ChatContext denied(ChatIntent intent, String reason) {
        return new ChatContext(intent, "DENIED", null, null, reason);
    }

    /** Tạo context lỗi */
    public static ChatContext error(String errorMessage) {
        return new ChatContext(ChatIntent.UNKNOWN, "ERROR", null, null, errorMessage);
    }
}
