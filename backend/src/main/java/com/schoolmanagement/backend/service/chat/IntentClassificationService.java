package com.schoolmanagement.backend.service.chat;

import com.schoolmanagement.backend.domain.chat.ChatIntent;
import org.springframework.stereotype.Service;

/**
 * Tầng 3 — Intent Classification Service
 *
 * Gửi prompt + tin nhắn người dùng đến Gemini AI.
 * AI CHỈ trả về MỘT mã intent (không thêm giải thích).
 * Service parse mã intent → ChatIntent enum.
 */
@Service
public class IntentClassificationService {

    private final LlmClient llmClient;

    /**
     * System prompt cho Intent Classifier.
     * Quy tắc nghiêm ngặt: AI chỉ trả về 1 mã duy nhất.
     */
    private static final String SYSTEM_PROMPT = """
            Bạn là bộ phân loại ý định (Intent Classifier) cho hệ thống trường học.

            NHIỆM VỤ: Phân loại tin nhắn người dùng vào ĐÚNG MỘT mã intent bên dưới.

            CÁC MÃ INTENT:
            - ASK_SCORE → Hỏi về điểm số, kết quả học tập, bảng điểm, thành tích
            - ASK_TIMETABLE → Hỏi về thời khóa biểu, lịch học (của HỌC SINH)
            - ASK_ABSENCE → Hỏi về điểm danh, vắng mặt, nghỉ phép, đi học, số buổi nghỉ
            - ASK_ANNOUNCEMENT → Hỏi về thông báo, tin tức, sự kiện của nhà trường
            - ASK_TEACHER_TIMETABLE → GIÁO VIÊN hỏi lịch DẠY cá nhân (sáng mai dạy lớp nào, tiết dạy)
            - ASK_HOMEROOM_CLASS → GIÁO VIÊN hỏi về lớp chủ nhiệm (sĩ số, vắng mấy em, danh sách HS)
            - ASK_QUICK_STATS → ADMIN hỏi thống kê nhanh (bao nhiêu HS/GV, tổng quan, toàn trường vắng mấy)
            - UNSUPPORTED_ACTION → Yêu cầu HÀNH ĐỘNG (thêm, sửa, xóa, tạo, cập nhật, đăng ký, hủy)
            - OUT_OF_SCOPE → Câu hỏi ngoài phạm vi (học phí, tài chính, chuyện cá nhân, giải trí)
            - UNKNOWN → Không thể phân loại hoặc tin nhắn quá mơ hồ

            QUY TẮC:
            1. CHỈ trả về DUY NHẤT mã intent (VD: ASK_SCORE). KHÔNG giải thích.
            2. Nếu tin nhắn chứa cả yêu cầu tra cứu VÀ hành động → ưu tiên UNSUPPORTED_ACTION.
            3. Phân biệt: "lịch học" (HS) → ASK_TIMETABLE, "lịch dạy" (GV) → ASK_TEACHER_TIMETABLE.
            4. Nếu không chắc chắn → trả về UNKNOWN.
            5. Câu chào hỏi đơn giản (xin chào, hi) → trả về UNKNOWN.
            """;

    public IntentClassificationService(LlmClient llmClient) {
        this.llmClient = llmClient;
    }

    /**
     * Phân loại ý định của tin nhắn người dùng.
     *
     * @param message Tin nhắn gốc
     * @return ChatIntent enum
     */
    public ChatIntent classify(String message) {
        try {
            String response = llmClient.generate(SYSTEM_PROMPT, message);
            return parseIntent(response.trim());
        } catch (Exception e) {
            System.err.println("Intent classification lỗi: " + e.getMessage());
            // Fallback: dùng keyword matching nếu AI fail
            return fallbackClassify(message);
        }
    }

    /**
     * Parse response text → ChatIntent enum.
     * Loại bỏ whitespace, dấu, markdown formatting.
     */
    private ChatIntent parseIntent(String response) {
        // Loại bỏ markdown backticks, newlines, extra spaces
        String cleaned = response
                .replaceAll("[`*\\n\\r]", "")
                .trim()
                .toUpperCase();

        try {
            return ChatIntent.valueOf(cleaned);
        } catch (IllegalArgumentException e) {
            // Thử tìm intent code trong response
            for (ChatIntent intent : ChatIntent.values()) {
                if (cleaned.contains(intent.name())) {
                    return intent;
                }
            }
            System.err.println("Không parse được intent từ AI response: '" + response + "'");
            return ChatIntent.UNKNOWN;
        }
    }

    /**
     * Fallback keyword-based classification khi AI không khả dụng.
     */
    private ChatIntent fallbackClassify(String message) {
        String lower = message.toLowerCase();

        if (lower.contains("điểm") || lower.contains("score") || lower.contains("kết quả")) {
            return ChatIntent.ASK_SCORE;
        }
        if (lower.contains("thời khóa biểu") || lower.contains("lịch học") || lower.contains("tkb")) {
            return ChatIntent.ASK_TIMETABLE;
        }
        if (lower.contains("điểm danh") || lower.contains("vắng") || lower.contains("nghỉ")
                || lower.contains("đi học")) {
            return ChatIntent.ASK_ABSENCE;
        }
        if (lower.contains("thông báo") || lower.contains("notification") || lower.contains("tin tức")) {
            return ChatIntent.ASK_ANNOUNCEMENT;
        }
        if (lower.contains("lịch dạy") || lower.contains("dạy lớp nào") || lower.contains("tiết dạy")) {
            return ChatIntent.ASK_TEACHER_TIMETABLE;
        }
        if (lower.contains("chủ nhiệm") || lower.contains("sĩ số") || lower.contains("lớp tôi")) {
            return ChatIntent.ASK_HOMEROOM_CLASS;
        }
        if (lower.contains("thống kê") || lower.contains("bao nhiêu học sinh")
                || lower.contains("toàn trường") || lower.contains("tổng quan")) {
            return ChatIntent.ASK_QUICK_STATS;
        }
        if (lower.contains("xóa") || lower.contains("sửa") || lower.contains("thêm") ||
                lower.contains("tạo") || lower.contains("cập nhật") || lower.contains("delete")) {
            return ChatIntent.UNSUPPORTED_ACTION;
        }
        if (lower.contains("học phí") || lower.contains("tiền") || lower.contains("phí")) {
            return ChatIntent.OUT_OF_SCOPE;
        }

        return ChatIntent.UNKNOWN;
    }
}
