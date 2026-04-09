package com.schoolmanagement.backend.service.chat;

import com.schoolmanagement.backend.dto.chat.ChatContext;
import com.schoolmanagement.backend.domain.auth.Role;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.stream.Collectors;

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
            
            QUY TẮC XƯNG HÔ DỰA TRÊN ROLE:
            - Nếu Role là GUARDIAN: Gọi người dùng là "anh/chị" hoặc "phụ huynh".
            - Nếu Role là TEACHER: Gọi người dùng là "thầy/cô".
            - Nếu Role là STUDENT: Gọi người dùng là "em" hoặc "bạn".
            - Nếu Role khác: Gọi là "anh/chị" chung.

            NHIỆM VỤ: Diễn đạt dữ liệu thô thành câu trả lời TỰ NHIÊN, THÂN THIỆN bằng tiếng Việt.

            QUY TẮC BẮT BUỘC:
            1. CHỈ sử dụng dữ liệu có trong "DỮ LIỆU" bên dưới. KHÔNG BỊA thêm thông tin.
            2. Nếu không có dữ liệu → nói "Hiện tại chưa có dữ liệu".
            3. Trình bày gọn gàng, KHÔNG sử dụng icon hay emoji.
            4. Nếu có bảng điểm → Trình bày đầy đủ các đầu điểm có dữ liệu (Điểm miệng, 15p, 45p, Giữa kỳ, Cuối kỳ) và highlight điểm trung bình.
            5. Nếu có thời khóa biểu → trình bày theo ngày, dễ đọc.
            6. Nếu có điểm danh → tổng hợp số liệu, nhấn mạnh tỷ lệ đi học.
            7. Nếu có thông báo → tóm tắt nội dung, sắp xếp theo thời gian.
            8. Giọng văn: lịch sự, chuyên nghiệp, phù hợp với đối tượng (phụ huynh/giáo viên/học sinh).
            9. Trả lời ngắn gọn, đi thẳng vào vấn đề. Tối đa 300 từ.
            10. KHÔNG sử dụng markdown heading (#). Dùng bullet points thay thế.
            """;

    public NlgService(LlmClient llmClient, ObjectMapper objectMapper) {
        this.llmClient = llmClient;
        this.objectMapper = objectMapper;
    }

    /**
     * Sinh câu trả lời tự nhiên từ ChatContext.
     *
     * @param context        Dữ liệu thô từ Handler
     * @param question       Câu hỏi gốc của người dùng
     * @param isFirstMessage Đây có phải tin nhắn đầu tiên trong phiên không?
     * @param role           Vai trò của người dùng
     * @return Câu trả lời tự nhiên
     */
    public String generate(ChatContext context, String question, boolean isFirstMessage, Role role) {
        // Nếu context là lỗi hoặc từ chối → trả trực tiếp (không cần AI)
        if (context.errorMessage() != null) {
            return context.errorMessage();
        }

        // Nếu cần làm rõ → sinh câu hỏi danh sách (không cần AI)
        if ("NEED_CLARIFICATION".equals(context.status()) && context.studentNames() != null) {
            String greeting = switch (role) {
                case GUARDIAN -> isFirstMessage ? "Chào anh/chị, " : "";
                case TEACHER -> isFirstMessage ? "Chào thầy/cô, " : "";
                case STUDENT -> isFirstMessage ? "Chào em, " : "";
                default -> isFirstMessage ? "Chào anh/chị, " : "";
            };
            StringBuilder sb = new StringBuilder(greeting);
            sb.append("Bạn muốn xem thông tin của đối tượng nào?\n");
            for (int i = 0; i < context.studentNames().size(); i++) {
                sb.append(String.format("%d. %s\n", i + 1, context.studentNames().get(i)));
            }
            return sb.toString().trim();
        }

        // Có data → gọi AI để diễn đạt
        try {
            String dataJson = objectMapper.writeValueAsString(context.data());

            String todayStr = String.format("Hôm nay là %s, ngày %s",
                    translateDayOfWeek(LocalDate.now().getDayOfWeek()),
                    LocalDate.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy")));

            String persona = switch (role) {
                case GUARDIAN -> "Phụ huynh (anh/chị)";
                case TEACHER -> "Giáo viên (thầy/cô)";
                case STUDENT -> "Học sinh (em/bạn)";
                default -> "người dùng";
            };

            String greetingRule = isFirstMessage 
                ? String.format("Chào hỏi người dùng phù hợp với vai trò %s ở đầu câu.", persona) 
                : "KHÔNG chào hỏi rườm rà, vào thẳng nội dung chính vì đây là câu hỏi tiếp theo trong hội thoại.";

            String userPrompt = String.format(
                    "ĐỐI TƯỢNG: %s\nVAI TRÒ: %s\nQUY TẮC CHÀO HỎI: %s\n\nTHÔNG TIN HỆ THỐNG:\n%s\n\nCÂU HỎI CỦA NGƯỜI DÙNG: %s\n\nDỮ LIỆU:\n%s",
                    persona, role, greetingRule, todayStr, question, dataJson);

            return llmClient.generate(SYSTEM_PROMPT, userPrompt);

        } catch (Exception e) {
            System.err.println("NLG lỗi, fallback sang format text: " + e.getMessage());
            // Fallback: format đơn giản nếu AI fail
            return fallbackFormat(context, isFirstMessage, role);
        }
    }

    /**
     * Better fallback formatter when AI fails.
     */
    private String fallbackFormat(ChatContext context, boolean isFirstMessage, Role role) {
        if (context.data() == null) {
            return "Đã nhận được yêu cầu, nhưng chưa có dữ liệu để hiển thị.";
        }
        if (context.data().containsKey("message")) {
            return context.data().get("message").toString();
        }

        String greeting = switch (role) {
            case GUARDIAN -> "Chào phụ huynh, ";
            case TEACHER -> "Chào thầy/cô, ";
            case STUDENT -> "Chào em, ";
            default -> "Chào bạn, ";
        };

        StringBuilder sb = new StringBuilder();
        if (isFirstMessage) {
            sb.append("(AI tạm thời gián đoạn) ").append(greeting).append("đây là thông tin tôi tìm thấy:\n\n");
        } else {
            sb.append("(AI tạm thời gián đoạn) Thông tin chi tiết:\n\n");
        }
        if (context.data().containsKey("studentName")) {
            sb.append("Học sinh: ").append(context.data().get("studentName")).append("\n");
        }

        switch (context.intent()) {
            case ASK_SCORE:
                if (context.data().containsKey("grades")) {
                    @SuppressWarnings("unchecked")
                    var grades = (java.util.List<java.util.Map<String, Object>>) context.data().get("grades");
                    sb.append("Bảng điểm:\n");
                    for (var g : grades) {
                        sb.append(String.format("  - %s (Học kỳ %s): TB = %s (%s)\n",
                                g.get("subject"), g.get("semester"), g.get("average"), g.get("rank")));
                    }
                }
                break;
            case ASK_ABSENCE:
                sb.append("Thông tin chuyên cần:\n");
                sb.append(String.format("  - Có mặt: %s | Vắng: %s | Đi muộn: %s\n",
                        context.data().getOrDefault("present", "—"),
                        context.data().getOrDefault("absent", "—"),
                        context.data().getOrDefault("late", "—")));
                sb.append("  - Tỷ lệ đi học: ").append(context.data().getOrDefault("attendanceRate", "—")).append("\n");
                break;
            case ASK_TIMETABLE:
                sb.append("Thời khóa biểu:\n");
                if (context.data().containsKey("schedule")) {
                    @SuppressWarnings("unchecked")
                    var schedule = (java.util.List<java.util.Map<String, Object>>) context.data().get("schedule");
                    for (var day : schedule) {
                        sb.append("  ").append(day.get("day")).append(": ");
                        @SuppressWarnings("unchecked")
                        var slots = (java.util.List<java.util.Map<String, Object>>) day.get("slots");
                        String subjects = slots.stream()
                                .map(s -> s.get("subject").toString())
                                .collect(Collectors.joining(", "));
                        sb.append(subjects).append("\n");
                    }
                }
                break;
            default:
                try {
                    return sb.toString()
                            + objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(context.data());
                } catch (Exception e) {
                    return "Đã có dữ liệu nhưng không thể định dạng.";
                }
        }

        return sb.toString().trim();
    }

    private String translateDayOfWeek(java.time.DayOfWeek day) {
        return switch (day) {
            case MONDAY -> "Thứ Hai";
            case TUESDAY -> "Thứ Ba";
            case WEDNESDAY -> "Thứ Tư";
            case THURSDAY -> "Thứ Năm";
            case FRIDAY -> "Thứ Sáu";
            case SATURDAY -> "Thứ Bảy";
            case SUNDAY -> "Chủ Nhật";
        };
    }
}
