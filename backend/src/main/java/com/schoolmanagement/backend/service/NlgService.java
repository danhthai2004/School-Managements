package com.schoolmanagement.backend.service;

import com.schoolmanagement.backend.dto.ChatContext;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

/**
 * Tầng 6 — Natural Language Generation (NLG)
 *
 * Nhận ChatContext (dữ liệu thô từ Handler) + câu hỏi gốc.
 * Gửi đến Gemini AI để sinh câu trả lời tự nhiên, thân thiện.
 *
 * QUY TẮC AN TOÀN:
 * - AI CHỈ được diễn đạt lại dữ liệu trong Context Object.
 * - AI KHÔNG ĐƯỢC thêm thông tin ngoài Context Object.
 * - AI KHÔNG ĐƯỢC bịa số liệu, điểm số, hay thông tin mới.
 */
@Service
public class NlgService {

    private final LlmClient llmClient;
    private final ObjectMapper objectMapper;

    /**
     * System prompt cho NLG.
     * Quy tắc: AI chỉ diễn đạt lại data, không bịa thêm.
     */
    private static final String SYSTEM_PROMPT = """
            Bạn là trợ lý ảo của hệ thống quản lý trường học.

            NHIỆM VỤ: Diễn đạt dữ liệu thô thành câu trả lời TỰ NHIÊN, THÂN THIỆN bằng tiếng Việt.

            QUY TẮC BẮT BUỘC:
            1. CHỈ sử dụng dữ liệu có trong "DỮ LIỆU" bên dưới. KHÔNG BỊA thêm thông tin.
            2. Nếu không có dữ liệu → nói "Hiện tại chưa có dữ liệu".
            3. Trình bày gọn gàng, dùng emoji phù hợp (📊 điểm, 📅 lịch, ✅ điểm danh, 📢 thông báo).
            4. Nếu có bảng điểm → trình bày dạng danh sách, highlight điểm trung bình.
            5. Nếu có thời khóa biểu → trình bày theo ngày, dễ đọc.
            6. Nếu có điểm danh → tổng hợp số liệu, nhấn mạnh tỷ lệ đi học.
            7. Nếu có thông báo → tóm tắt nội dung, sắp xếp theo thời gian.
            8. Giọng văn: lịch sự, chuyên nghiệp, không quá formal.
            9. Trả lời ngắn gọn, đi thẳng vào vấn đề. Tối đa 300 từ.
            10. KHÔNG sử dụng markdown heading (#). Dùng emoji và bullet points thay thế.
            """;

    public NlgService(LlmClient llmClient, ObjectMapper objectMapper) {
        this.llmClient = llmClient;
        this.objectMapper = objectMapper;
    }

    /**
     * Sinh câu trả lời tự nhiên từ ChatContext.
     *
     * @param context  Dữ liệu thô từ Handler
     * @param question Câu hỏi gốc của người dùng
     * @return Câu trả lời tự nhiên
     */
    public String generate(ChatContext context, String question) {
        // Nếu context là lỗi hoặc từ chối → trả trực tiếp (không cần AI)
        if (context.errorMessage() != null) {
            return context.errorMessage();
        }

        // Nếu cần làm rõ → sinh câu hỏi danh sách (không cần AI)
        if ("NEED_CLARIFICATION".equals(context.status()) && context.studentNames() != null) {
            StringBuilder sb = new StringBuilder("Anh/chị muốn xem thông tin của bé nào?\n");
            for (int i = 0; i < context.studentNames().size(); i++) {
                sb.append(String.format("%d. %s\n", i + 1, context.studentNames().get(i)));
            }
            return sb.toString().trim();
        }

        // Có data → gọi AI để diễn đạt
        try {
            String dataJson = objectMapper.writeValueAsString(context.data());

            String userPrompt = String.format(
                    "CÂU HỎI CỦA NGƯỜI DÙNG: %s\n\nDỮ LIỆU:\n%s",
                    question, dataJson);

            return llmClient.generate(SYSTEM_PROMPT, userPrompt);

        } catch (Exception e) {
            System.err.println("NLG lỗi, fallback sang format text: " + e.getMessage());
            // Fallback: format đơn giản nếu AI fail
            return fallbackFormat(context);
        }
    }

    /**
     * Fallback formatter khi AI không khả dụng.
     */
    private String fallbackFormat(ChatContext context) {
        if (context.data() == null) {
            return "Đang xử lý yêu cầu của bạn...";
        }
        if (context.data().containsKey("message")) {
            return context.data().get("message").toString();
        }
        try {
            return objectMapper.writerWithDefaultPrettyPrinter()
                    .writeValueAsString(context.data());
        } catch (Exception e) {
            return "Đã có dữ liệu nhưng không thể hiển thị.";
        }
    }
}
