package com.schoolmanagement.backend.dto.chat;

import com.schoolmanagement.backend.domain.chat.ChatIntent;

import java.util.List;

/**
 * DTO cho response trả về từ chatbot.
 *
 * @param answer         Câu trả lời dạng văn bản tự nhiên
 * @param intent         Ý định đã phân loại (để frontend xử lý UI nếu cần)
 * @param status         Trạng thái: OK, NEED_CLARIFICATION, DENIED,
 *                       UNSUPPORTED, OUT_OF_SCOPE
 * @param studentOptions Danh sách tên học sinh cho trường hợp cần làm rõ
 *                       (Guardian có nhiều con)
 */
public record ChatResponse(
        String answer,
        ChatIntent intent,
        String status,
        List<String> studentOptions) {
    /** Trả về phản hồi thành công bình thường */
    public static ChatResponse ok(String answer, ChatIntent intent) {
        return new ChatResponse(answer, intent, "OK", null);
    }

    /** Trả về phản hồi yêu cầu làm rõ (Guardian có nhiều con) */
    public static ChatResponse needClarification(String answer, ChatIntent intent, List<String> studentNames) {
        return new ChatResponse(answer, intent, "NEED_CLARIFICATION", studentNames);
    }

    /** Trả về phản hồi từ chối (ngoài phạm vi hoặc không hỗ trợ) */
    public static ChatResponse denied(String answer, ChatIntent intent) {
        return new ChatResponse(answer, intent, "DENIED", null);
    }
}
