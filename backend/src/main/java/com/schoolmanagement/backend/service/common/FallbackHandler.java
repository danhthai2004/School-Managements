package com.schoolmanagement.backend.service.common;

import com.schoolmanagement.backend.service.chat.ChatHandler;

import com.schoolmanagement.backend.domain.chat.ChatIntent;
import com.schoolmanagement.backend.dto.chat.ChatContext;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * Tầng 5 — Fallback Handler
 * Xử lý các intent không thể trả lời: UNKNOWN, UNSUPPORTED_ACTION,
 * OUT_OF_SCOPE.
 */
@Component
public class FallbackHandler implements ChatHandler {

    @Override
    public ChatContext handle(UUID userId, String message) {
        return ChatContext.denied(ChatIntent.UNKNOWN,
                "Xin lỗi, tôi không hiểu câu hỏi của bạn. " +
                        "Bạn có thể hỏi về: điểm số, thời khóa biểu, điểm danh, hoặc thông báo nhà trường.");
    }

    /** Trả về context từ chối cho hành động không hỗ trợ */
    public ChatContext handleUnsupported() {
        return ChatContext.denied(ChatIntent.UNSUPPORTED_ACTION,
                "Xin lỗi, tôi chỉ hỗ trợ tra cứu thông tin. " +
                        "Tôi không thể thực hiện các hành động như thêm, sửa, xóa dữ liệu.");
    }

    /** Trả về context từ chối cho câu hỏi ngoài phạm vi */
    public ChatContext handleOutOfScope() {
        return ChatContext.denied(ChatIntent.OUT_OF_SCOPE,
                "Xin lỗi, câu hỏi này nằm ngoài phạm vi hỗ trợ của tôi. " +
                        "Tôi chỉ quản lý thông tin về điểm số, thời khóa biểu, điểm danh, và thông báo của nhà trường.");
    }
}
