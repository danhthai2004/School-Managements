package com.schoolmanagement.backend.service.chat;

import com.schoolmanagement.backend.dto.chat.ChatContext;
import com.schoolmanagement.backend.domain.auth.Role;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

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
 *
 * Đây là nguồn duy nhất (Single Source of Truth) cho việc format câu trả lời,
 * bao gồm cả AI generation và fallback khi AI không khả dụng.
 */
@Service
public class NlgService {

    private static final Logger log = LoggerFactory.getLogger(NlgService.class);

    private final LlmClient llmClient;
    private final ObjectMapper objectMapper;

    /**
     * System prompt cho NLG.
     * Quy tắc: AI chỉ diễn đạt lại data, không bịa thêm.
     */
    private static final String SYSTEM_PROMPT = """
            Bạn là Trợ lý Ảo Học đường ISS — một tư vấn viên học đường thông minh, tận tâm và chuyên nghiệp.

            TÍNH CÁCH:
            - Thân thiện, ấm áp và luôn sẵn lòng giúp đỡ.
            - Ngôn ngữ lịch sự, rõ ràng nhưng không quá cứng nhắc.

            QUY TẮC TRÌNH BÀY (RICH FORMATTING):
            1. PHÂN BIỆT DỮ LIỆU NGẮN VÀ DÀI:
               - Nếu dữ liệu NGẮN (ví dụ: thời khóa biểu của 1 ngày duy nhất), hãy dùng DANH SÁCH THEO HÀNG (gạch đầu dòng).
               - Nếu dữ liệu DÀI (ví dụ: thời khóa biểu nhiều ngày, cả tuần, hoặc Bảng điểm), BẮT BUỘC dùng Markdown Table để dễ nhìn.
            2. VỚI DANH SÁCH THEO HÀNG: Mỗi mục phải nằm trên MỘT DÒNG RIÊNG. TUYỆT ĐỐI KHÔNG gộp nhiều mục vào 1 dòng bằng dấu phẩy.
            3. ICON/EMOJI: Sử dụng emoji tinh tế để làm câu trả lời sinh động (📚, ✅, ⏰, 📅).
            4. HIGHLIGHT: Sử dụng **bold** để nhấn mạnh các thông số quan trọng.
            5. GIỚI HẠN: Chỉ sử dụng dữ liệu trong phần "DỮ LIỆU". Tuyệt đối không bịa số liệu.
            6. Nếu dữ liệu trống: Trả lời khéo léo thay vì báo lỗi.

            VÍ DỤ TRÌNH BÀY ĐÚNG DỮ LIỆU NGẮN (TKB 1 ngày):
            📅 **Thứ Tư:**
            - Tiết 1: Toán (Nguyễn Văn A)
            - Tiết 2: Văn (Trần Thị B)

            VÍ DỤ TRÌNH BÀY ĐÚNG DỮ LIỆU DÀI (TKB Nhiều ngày):
            | Thứ | Tiết | Môn học | Giáo viên | Phòng |
            |---|---|---|---|---|
            | Thứ Tư | 1 | Toán | Nguyễn Văn A | P.101 |
            | Thứ Tư | 2 | Văn | Trần Thị B | P.102 |

            VÍ DỤ SAI (KHÔNG LÀM THẾ NÀY):
            Thứ Tư: Tiết 1: Toán, Tiết 2: Văn, Tiết 3: Anh

            GUARDRAILS:
            7. TUYỆT ĐỐI KHÔNG làm bài tập hộ hoặc tiết lộ thông tin người dùng khác.
            """;

    public NlgService(LlmClient llmClient, ObjectMapper objectMapper) {
        this.llmClient = llmClient;
        this.objectMapper = objectMapper;
    }

    /**
     * Sinh câu trả lời tự nhiên từ ChatContext.
     * Tự động fallback sang format text nếu AI không khả dụng hoặc gặp lỗi.
     *
     * @param context        Dữ liệu thô từ Handler
     * @param question       Câu hỏi gốc của người dùng
     * @param isFirstMessage Đây có phải tin nhắn đầu tiên trong phiên không?
     * @param role           Vai trò của người dùng
     * @param aiEnabled      AI có được cấu hình hay không
     * @return Câu trả lời tự nhiên
     */
    public String generate(ChatContext context, String question, boolean isFirstMessage, Role role, boolean aiEnabled) {
        // Nếu context là lỗi hoặc từ chối → trả trực tiếp (không cần AI)
        if (context.errorMessage() != null) {
            return context.errorMessage();
        }

        // Nếu cần làm rõ → sinh câu hỏi danh sách (không cần AI)
        if ("NEED_CLARIFICATION".equals(context.status()) && context.studentNames() != null) {
            return buildClarificationResponse(context, isFirstMessage, role);
        }

        // AI không khả dụng → fallback format text
        if (!aiEnabled) {
            return fallbackFormat(context, isFirstMessage, role);
        }

        // Có data → gọi AI để diễn đạt
        try {
            String dataJson = objectMapper.writeValueAsString(context.data());

            String todayStr = String.format("Hôm nay là %s, ngày %s",
                    translateDayOfWeek(LocalDate.now().getDayOfWeek()),
                    LocalDate.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy")));

            String persona = formatPersona(role);

            String greetingRule = isFirstMessage
                    ? String.format("Chào hỏi người dùng phù hợp với vai trò %s ở đầu câu.", persona)
                    : "KHÔNG chào hỏi rườm rà, vào thẳng nội dung chính vì đây là câu hỏi tiếp theo trong hội thoại.";

            String userPrompt = String.format(
                    "ĐỐI TƯỢNG: %s\nVAI TRÒ: %s\nQUY TẮC CHÀO HỎI: %s\n\nTHÔNG TIN HỆ THỐNG:\n%s\n\nCÂU HỎI CỦA NGƯỜI DÙNG: %s\n\nDỮ LIỆU:\n%s",
                    persona, role, greetingRule, todayStr, question, dataJson);

            return llmClient.generate(SYSTEM_PROMPT, userPrompt);

        } catch (Exception e) {
            log.warn("NLG lỗi, fallback sang format text: {}", e.getMessage());
            return fallbackFormat(context, isFirstMessage, role);
        }
    }

    // ═══════════════════════════════════════════════════
    // HELPER: Build clarification response
    // ═══════════════════════════════════════════════════

    private String buildClarificationResponse(ChatContext context, boolean isFirstMessage, Role role) {
        String greeting = isFirstMessage ? formatGreeting(role) : "";
        StringBuilder sb = new StringBuilder(greeting);
        sb.append("Bạn muốn xem thông tin của đối tượng nào?\n");
        for (int i = 0; i < context.studentNames().size(); i++) {
            sb.append(String.format("%d. %s\n", i + 1, context.studentNames().get(i)));
        }
        return sb.toString().trim();
    }

    // ═══════════════════════════════════════════════════
    // FALLBACK FORMATTER (Single Source of Truth)
    // ═══════════════════════════════════════════════════

    /**
     * Format dữ liệu thô thành text khi AI không khả dụng hoặc gặp lỗi.
     */
    private String fallbackFormat(ChatContext context, boolean isFirstMessage, Role role) {
        if (context.data() == null) {
            return "Đã nhận được yêu cầu, nhưng chưa có dữ liệu để hiển thị.";
        }
        if (context.data().containsKey("message")) {
            return context.data().get("message").toString();
        }

        StringBuilder sb = new StringBuilder();
        if (isFirstMessage) {
            sb.append(formatGreeting(role)).append("đây là thông tin tôi tìm thấy:\n\n");
        }
        if (context.data().containsKey("studentName")) {
            sb.append("Học sinh: ").append(context.data().get("studentName")).append("\n");
        }

        // Format theo từng loại intent
        switch (context.intent()) {
            case ASK_SCORE -> formatScoreFallback(sb, context);
            case ASK_ABSENCE -> formatAbsenceFallback(sb, context);
            case ASK_TIMETABLE -> formatTimetableFallback(sb, context);
            case ASK_ANNOUNCEMENT -> formatAnnouncementFallback(sb, context);
            case ASK_TEACHER_TIMETABLE -> formatTeacherTimetableFallback(sb, context);
            case ASK_HOMEROOM_CLASS -> formatHomeroomFallback(sb, context);
            case ASK_QUICK_STATS -> formatQuickStatsFallback(sb, context);
            default -> {
                try {
                    sb.append(objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(context.data()));
                } catch (Exception e) {
                    sb.append("Đã có dữ liệu nhưng không thể định dạng.");
                }
            }
        }

        return sb.isEmpty() ? "Đã nhận được dữ liệu." : sb.toString().trim();
    }

    // ── Fallback formatters per intent ──

    @SuppressWarnings("unchecked")
    private void formatScoreFallback(StringBuilder sb, ChatContext context) {
        if (!context.data().containsKey("grades"))
            return;
        var grades = (List<Map<String, Object>>) context.data().get("grades");
        sb.append("📚 Bảng điểm:\n");
        for (var g : grades) {
            sb.append(String.format("  - %s (HK%s): TB = %s (%s)\n",
                    g.get("subject"), g.get("semester"), g.get("average"), g.get("rank")));
        }
    }

    private void formatAbsenceFallback(StringBuilder sb, ChatContext context) {
        sb.append("📋 **Thông tin chuyên cần (tính theo Tiết học):**\n");
        sb.append(String.format("  - Tổng tiết đã điểm danh: %s\n",
                context.data().getOrDefault("totalRecordedSlots", "—")));
        sb.append(String.format("  - ✅ Tiết có mặt: %s\n", context.data().getOrDefault("presentSlots", "—")));
        sb.append(String.format("  - ❌ Tiết vắng: %s\n", context.data().getOrDefault("absentSlots", "—")));
        sb.append(String.format("  - ⏰ Tiết trễ: %s\n", context.data().getOrDefault("lateSlots", "—")));
        sb.append(String.format("  - 📝 Tiết phép: %s\n", context.data().getOrDefault("excusedSlots", "—")));
        sb.append(String.format("  - 📊 Tỷ lệ chuyên cần: %s\n", context.data().getOrDefault("attendanceRate", "—")));
    }

    @SuppressWarnings("unchecked")
    private void formatTimetableFallback(StringBuilder sb, ChatContext context) {
        sb.append("📅 Lớp: ").append(context.data().getOrDefault("className", "")).append("\n");
        if (!context.data().containsKey("schedule"))
            return;
        var schedule = (List<Map<String, Object>>) context.data().get("schedule");
        for (var day : schedule) {
            sb.append("\n**").append(day.get("day")).append(":**\n");
            var slots = (List<Map<String, Object>>) day.get("slots");
            for (var slot : slots) {
                sb.append(String.format("  - Tiết %s: %s\n", slot.get("slot"), slot.get("subject")));
            }
        }
    }

    @SuppressWarnings("unchecked")
    private void formatAnnouncementFallback(StringBuilder sb, ChatContext context) {
        if (!context.data().containsKey("notifications"))
            return;
        var notifications = (List<Map<String, Object>>) context.data().get("notifications");
        sb.append("📢 Thông báo:\n");
        for (var n : notifications) {
            sb.append(String.format("  [%s] %s\n  %s\n", n.get("date"), n.get("title"), n.get("content")));
        }
    }

    @SuppressWarnings("unchecked")
    private void formatTeacherTimetableFallback(StringBuilder sb, ChatContext context) {
        sb.append("👨‍🏫 GV: ").append(context.data().getOrDefault("teacherName", "")).append("\n");
        sb.append(String.format("Tổng: %s tiết\n", context.data().getOrDefault("totalSlots", "—")));
        if (!context.data().containsKey("schedule"))
            return;
        var schedule = (List<Map<String, Object>>) context.data().get("schedule");
        for (var day : schedule) {
            sb.append(day.get("day")).append(":\n");
            var slots = (List<Map<String, Object>>) day.get("slots");
            for (var slot : slots) {
                sb.append(String.format("  Tiết %s: %s (%s)\n", slot.get("slot"), slot.get("subject"),
                        slot.get("class")));
            }
        }
    }

    private void formatHomeroomFallback(StringBuilder sb, ChatContext context) {
        sb.append(String.format("🏫 Lớp: %s | Sĩ số: %s\n",
                context.data().getOrDefault("className", "—"),
                context.data().getOrDefault("totalStudents", "—")));
        sb.append(String.format("Hôm nay (%s): Vắng %s | Trễ %s | Phép %s\n",
                context.data().getOrDefault("date", "—"),
                context.data().getOrDefault("absentToday", "0"),
                context.data().getOrDefault("lateToday", "0"),
                context.data().getOrDefault("excusedToday", "0")));
        if (context.data().containsKey("absentStudents")) {
            sb.append("HS vắng: ").append(context.data().get("absentStudents")).append("\n");
        }
    }

    private void formatQuickStatsFallback(StringBuilder sb, ChatContext context) {
        sb.append(String.format("📊 %s — %s\n",
                context.data().getOrDefault("schoolName", ""),
                context.data().getOrDefault("date", "")));
        sb.append(String.format("Tổng: %s HS | %s GV | %s lớp\n",
                context.data().getOrDefault("totalStudents", "—"),
                context.data().getOrDefault("totalTeachers", "—"),
                context.data().getOrDefault("totalClasses", "—")));
        if (Boolean.TRUE.equals(context.data().get("hasAttendanceToday"))) {
            sb.append(String.format("Điểm danh hôm nay: Có mặt %s | Vắng %s | Trễ %s | Phép %s\n",
                    context.data().getOrDefault("presentToday", "0"),
                    context.data().getOrDefault("absentToday", "0"),
                    context.data().getOrDefault("lateToday", "0"),
                    context.data().getOrDefault("excusedToday", "0")));
            sb.append("Tỷ lệ đi học: ").append(context.data().getOrDefault("attendanceRate", "—")).append("\n");
        } else {
            sb.append("Chưa có dữ liệu điểm danh hôm nay.\n");
        }
    }

    // ═══════════════════════════════════════════════════
    // UTILITY METHODS
    // ═══════════════════════════════════════════════════

    private String formatPersona(Role role) {
        return switch (role) {
            case GUARDIAN -> "Phụ huynh (anh/chị)";
            case TEACHER -> "Giáo viên (thầy/cô)";
            case STUDENT -> "Học sinh (em/bạn)";
            default -> "người dùng";
        };
    }

    private String formatGreeting(Role role) {
        return switch (role) {
            case GUARDIAN -> "Chào anh/chị, ";
            case TEACHER -> "Chào thầy/cô, ";
            case STUDENT -> "Chào em, ";
            default -> "Chào bạn, ";
        };
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
