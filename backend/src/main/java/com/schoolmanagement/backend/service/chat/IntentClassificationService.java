package com.schoolmanagement.backend.service.chat;

import com.schoolmanagement.backend.domain.chat.ChatIntent;
import com.schoolmanagement.backend.dto.chat.RoutingDecision;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.JsonNode;

import java.util.Map;
import java.util.HashMap;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/**
 * Tầng 3 — LLM Dynamic Router
 *
 * Nhận tin nhắn + thông tin User. LLM quyết định:
 * 1. SMALL_TALK: Nói chuyện phiếm
 * 2. REJECT: Từ chối yêu cầu ngoài phạm vi
 * 3. FUNCTION_CALL: Gọi hàm nội bộ để lấy dữ liệu
 */
@Service
public class IntentClassificationService {

    private final LlmClient llmClient;
    private final ObjectMapper objectMapper;
    private static final Logger log = LoggerFactory.getLogger(IntentClassificationService.class);

    private static final String SYSTEM_PROMPT = """
            Bạn là Trợ lý Ảo Thông minh (AI Assistant) của Hệ thống Quản lý Trường học.
            Thông tin người dùng đang giao tiếp: Tên: %s, Vai trò: %s.

            NHIỆM VỤ: Phân tích tin nhắn và quyết định luồng xử lý bằng cách trả về ĐÚNG 1 ĐOẠN JSON CHUẨN, không có bất kỳ văn bản nào khác.

            CÁC HÀM CÓ THỂ GỌI (FUNCTION_CALL):
            - ASK_SCORE (lấy điểm)
            - ASK_TIMETABLE (lịch học học sinh)
            - ASK_ABSENCE (điểm danh/vắng)
            - ASK_ANNOUNCEMENT (thông báo trường)
            - ASK_TEACHER_TIMETABLE (lịch dạy giáo viên)
            - ASK_HOMEROOM_CLASS (lớp chủ nhiệm)
            - ASK_QUICK_STATS (thống kê tổng quan cho admin)

            CÁCH XỬ LÝ (TRẢ VỀ JSON):
            1. Nếu là chào hỏi, cảm ơn, tán gẫu (Small Talk):
            { "routingType": "SMALL_TALK", "reply": "Dạ em chào anh/chị/bạn... [Chào hỏi lịch sự dựa theo tên và vai trò].", "function": null }

            2. Nếu người dùng hỏi các luồng nằm ngoài hệ thống hoặc yêu cầu XÓA, SỬA, THÊM dữ liệu (Chỉ hỗ trợ xem):
            { "routingType": "REJECT", "reply": "Xin lỗi, hiện tại em chỉ hỗ trợ tra cứu thông tin...", "function": null }

            3. Nếu là yêu cầu tra cứu thông tin hợp lệ (Gọi Backend Function):
            { "routingType": "FUNCTION_CALL", "reply": null, "function": "[MỘT_TRONG_CÁC_HÀM_BÊN_TRÊN]", "parameters": { "timeRange": "today|this_week|this_month|semester_1", "subjectName": "...", "targetStudent": "..." } }

            LƯU Ý VỀ THỜI GIAN:
            - "tuần này" -> timeRange: "this_week"
            - "tháng này" -> timeRange: "this_month"
            - "hôm nay" -> timeRange: "today"

            QUY TẮC BẮT BUỘC: CHỈ trả về JSON. Không định dạng markdown bọc ngoài (không dùng ```json). Nếu không biết chắc, hãy chọn SMALL_TALK.
            """;

    public IntentClassificationService(LlmClient llmClient, ObjectMapper objectMapper) {
        this.llmClient = llmClient;
        this.objectMapper = objectMapper;
    }

    /**
     * Parse tin nhắn thành RoutingDecision.
     */
    public RoutingDecision classify(String message, String userName, String role) {
        try {
            String prompt = String.format(SYSTEM_PROMPT, userName, role);
            String response = llmClient.generate(prompt, message);

            // Xử lý json bị bọc markdown
            response = response.replaceAll("```json", "").replaceAll("```", "").trim();

            JsonNode root = objectMapper.readTree(response);

            String rType = root.path("routingType").asText("SMALL_TALK");
            String reply = root.path("reply").asText(null);
            if (reply != null && reply.isBlank())
                reply = null;

            String funcStr = root.path("function").asText(null);
            ChatIntent func = null;
            if (funcStr != null && !funcStr.isBlank() && !funcStr.equals("null")) {
                try {
                    func = ChatIntent.valueOf(funcStr);
                } catch (Exception ignored) {
                }
            }

            // Parse parameters
            Map<String, String> parameters = new HashMap<>();
            JsonNode paramsNode = root.path("parameters");
            if (paramsNode.isObject()) {
                paramsNode.fields().forEachRemaining(entry -> {
                    parameters.put(entry.getKey(), entry.getValue().asText());
                });
            }

            return new RoutingDecision(rType, reply, func, parameters);

        } catch (Exception e) {
            log.warn("Intent Router lỗi: {}", e.getMessage());
            return new RoutingDecision("SMALL_TALK",
                    "Dạ, em đang gặp chút trục trặc trong việc xử lý ý định của mình. Anh/chị có thể nói rõ hơn được không ạ?",
                    null, Map.of());
        }
    }
}
