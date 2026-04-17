package com.schoolmanagement.backend.service.chat;

import com.schoolmanagement.backend.service.grade.ScoreHandler;
import com.schoolmanagement.backend.service.timetable.TimetableHandler;
import com.schoolmanagement.backend.service.attendance.AttendanceHandler;
import com.schoolmanagement.backend.service.common.AnnouncementHandler;
import com.schoolmanagement.backend.service.timetable.TeacherTimetableHandler;
import com.schoolmanagement.backend.service.common.HomeroomHandler;
import com.schoolmanagement.backend.service.common.QuickStatsHandler;
import com.schoolmanagement.backend.service.common.FallbackHandler;

import com.schoolmanagement.backend.domain.chat.ChatIntent;
import com.schoolmanagement.backend.domain.auth.Role;
import com.schoolmanagement.backend.domain.entity.chat.ChatMessage;
import com.schoolmanagement.backend.domain.entity.auth.User;
import com.schoolmanagement.backend.dto.chat.ChatContext;
import com.schoolmanagement.backend.dto.chat.ChatResponse;
import com.schoolmanagement.backend.repo.chat.ChatMessageRepository;
import com.schoolmanagement.backend.repo.auth.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.UUID;

/**
 * Tầng điều phối chính (Orchestrator) — Kết nối 6 lớp:
 *
 * 1. Nhận message + userId + role từ Controller
 * 2. IntentClassificationService → phân loại ý định (Gemini AI)
 * 3. Switch-case Router → điều hướng đến Handler tương ứng
 * 4. Handler trả về ChatContext (dữ liệu thô)
 * 5. NlgService → sinh câu trả lời tự nhiên (Gemini AI)
 * 6. Lưu log vào ChatMessage
 */
@Service
public class ChatService {

    private final UserRepository userRepository;
    private final ChatMessageRepository chatMessageRepository;

    // ──── AI Services ────
    private final IntentClassificationService intentClassifier;
    private final NlgService nlgService;

    // ──── Handlers ────
    private final ScoreHandler scoreHandler;
    private final TimetableHandler timetableHandler;
    private final AttendanceHandler attendanceHandler;
    private final AnnouncementHandler announcementHandler;
    private final TeacherTimetableHandler teacherTimetableHandler;
    private final HomeroomHandler homeroomHandler;
    private final QuickStatsHandler quickStatsHandler;
    private final FallbackHandler fallbackHandler;

    @Value("${app.llm.api-key:}")
    private String llmApiKey;

    public ChatService(UserRepository userRepository,
            ChatMessageRepository chatMessageRepository,
            IntentClassificationService intentClassifier,
            NlgService nlgService,
            ScoreHandler scoreHandler,
            TimetableHandler timetableHandler,
            AttendanceHandler attendanceHandler,
            AnnouncementHandler announcementHandler,
            TeacherTimetableHandler teacherTimetableHandler,
            HomeroomHandler homeroomHandler,
            QuickStatsHandler quickStatsHandler,
            FallbackHandler fallbackHandler) {
        this.userRepository = userRepository;
        this.chatMessageRepository = chatMessageRepository;
        this.intentClassifier = intentClassifier;
        this.nlgService = nlgService;
        this.scoreHandler = scoreHandler;
        this.timetableHandler = timetableHandler;
        this.attendanceHandler = attendanceHandler;
        this.announcementHandler = announcementHandler;
        this.teacherTimetableHandler = teacherTimetableHandler;
        this.homeroomHandler = homeroomHandler;
        this.quickStatsHandler = quickStatsHandler;
        this.fallbackHandler = fallbackHandler;
    }

    /**
     * Xử lý tin nhắn chat theo luồng 6 bước.
     */
    public ChatResponse process(String message, UUID userId, Role role) {

        // ──── Bước 1: Phân loại ý định (Intent Classification) ────
        ChatIntent intent;
        if (isAiEnabled()) {
            intent = intentClassifier.classify(message);
        } else {
            intent = fallbackClassify(message);
        }

        // ──── Bước 2: Điều hướng đến Handler (Intent Router) ────
        ChatContext context = routeIntent(intent, userId, message);

        // ──── Bước 3: Sinh ngôn ngữ tự nhiên (NLG) ────
        String answer;
        if (isAiEnabled()) {
            answer = nlgService.generate(context, message);
        } else {
            answer = fallbackGenerateResponse(context, message);
        }

        // ──── Bước 4: Lưu log ────
        saveLog(userId, message, intent, answer);

        // ──── Bước 5: Trả về response ────
        return buildResponse(answer, context);
    }

    // ═══════════════════════════════════════════════════
    // INTENT ROUTER (Switch-case — không cho AI tự quyết)
    // ═══════════════════════════════════════════════════

    private ChatContext routeIntent(ChatIntent intent, UUID userId, String message) {
        return switch (intent) {
            case ASK_SCORE -> scoreHandler.handle(userId, message);
            case ASK_TIMETABLE -> timetableHandler.handle(userId, message);
            case ASK_ABSENCE -> attendanceHandler.handle(userId, message);
            case ASK_ANNOUNCEMENT -> announcementHandler.handle(userId, message);
            case ASK_TEACHER_TIMETABLE -> teacherTimetableHandler.handle(userId, message);
            case ASK_HOMEROOM_CLASS -> homeroomHandler.handle(userId, message);
            case ASK_QUICK_STATS -> quickStatsHandler.handle(userId, message);
            case UNSUPPORTED_ACTION -> fallbackHandler.handleUnsupported();
            case OUT_OF_SCOPE -> fallbackHandler.handleOutOfScope();
            case UNKNOWN -> fallbackHandler.handle(userId, message);
        };
    }

    // ═══════════════════════════════════════════════════
    // HELPER METHODS
    // ═══════════════════════════════════════════════════

    /** Kiểm tra AI đã được cấu hình chưa */
    private boolean isAiEnabled() {
        return llmApiKey != null && !llmApiKey.isBlank();
    }

    /**
     * Fallback intent classification (keyword-based) khi AI chưa cấu hình.
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

    /**
     * Fallback NLG khi AI chưa cấu hình — format text đơn giản.
     */
    private String fallbackGenerateResponse(ChatContext context, String message) {
        if (context.errorMessage() != null) {
            return context.errorMessage();
        }

        if ("NEED_CLARIFICATION".equals(context.status()) && context.studentNames() != null) {
            StringBuilder sb = new StringBuilder("Anh/chị muốn xem thông tin của bé nào?\n");
            for (int i = 0; i < context.studentNames().size(); i++) {
                sb.append(String.format("%d. %s\n", i + 1, context.studentNames().get(i)));
            }
            return sb.toString().trim();
        }

        if (context.data() != null) {
            if (context.data().containsKey("message")) {
                return context.data().get("message").toString();
            }
            return formatDataAsText(context);
        }

        return "Đang xử lý yêu cầu của bạn...";
    }

    /**
     * Format data thô thành text đơn giản (fallback).
     */
    private String formatDataAsText(ChatContext context) {
        StringBuilder sb = new StringBuilder();

        if (context.data().containsKey("studentName")) {
            sb.append("📋 Học sinh: ").append(context.data().get("studentName")).append("\n");
        }

        if (context.intent() == ChatIntent.ASK_SCORE && context.data().containsKey("grades")) {
            @SuppressWarnings("unchecked")
            var grades = (java.util.List<java.util.Map<String, Object>>) context.data().get("grades");
            sb.append("📊 Bảng điểm:\n");
            for (var g : grades) {
                sb.append(String.format("  - %s (HK%s): TB = %s (%s)\n",
                        g.get("subject"), g.get("semester"),
                        g.get("average"), g.get("rank")));
            }
        }

        if (context.intent() == ChatIntent.ASK_ABSENCE) {
            sb.append(String.format("✅ Tổng buổi: %s | Có mặt: %s | Vắng: %s | Trễ: %s | Phép: %s\n",
                    context.data().getOrDefault("totalSessions", "—"),
                    context.data().getOrDefault("present", "—"),
                    context.data().getOrDefault("absent", "—"),
                    context.data().getOrDefault("late", "—"),
                    context.data().getOrDefault("excused", "—")));
            sb.append("📈 Tỷ lệ đi học: ").append(context.data().getOrDefault("attendanceRate", "—")).append("\n");
        }

        if (context.intent() == ChatIntent.ASK_TIMETABLE && context.data().containsKey("schedule")) {
            sb.append("📅 Lớp: ").append(context.data().getOrDefault("className", "")).append("\n");
            @SuppressWarnings("unchecked")
            var schedule = (java.util.List<java.util.Map<String, Object>>) context.data().get("schedule");
            for (var day : schedule) {
                sb.append(day.get("day")).append(":\n");
                @SuppressWarnings("unchecked")
                var slots = (java.util.List<java.util.Map<String, Object>>) day.get("slots");
                for (var slot : slots) {
                    sb.append(String.format("  Tiết %s: %s\n", slot.get("slot"), slot.get("subject")));
                }
            }
        }

        if (context.intent() == ChatIntent.ASK_ANNOUNCEMENT && context.data().containsKey("notifications")) {
            @SuppressWarnings("unchecked")
            var notifications = (java.util.List<java.util.Map<String, Object>>) context.data().get("notifications");
            sb.append("📢 Thông báo:\n");
            for (var n : notifications) {
                sb.append(String.format("  [%s] %s\n  %s\n",
                        n.get("date"), n.get("title"), n.get("content")));
            }
        }

        if (context.intent() == ChatIntent.ASK_TEACHER_TIMETABLE && context.data().containsKey("schedule")) {
            sb.append("👨‍🏫 GV: ").append(context.data().getOrDefault("teacherName", "")).append("\n");
            sb.append(String.format("Tổng: %s tiết\n", context.data().getOrDefault("totalSlots", "—")));
            @SuppressWarnings("unchecked")
            var schedule = (java.util.List<java.util.Map<String, Object>>) context.data().get("schedule");
            for (var day : schedule) {
                sb.append(day.get("day")).append(":\n");
                @SuppressWarnings("unchecked")
                var slots = (java.util.List<java.util.Map<String, Object>>) day.get("slots");
                for (var slot : slots) {
                    sb.append(String.format("  Tiết %s: %s (%s)\n", slot.get("slot"), slot.get("subject"),
                            slot.get("class")));
                }
            }
        }

        if (context.intent() == ChatIntent.ASK_HOMEROOM_CLASS) {
            sb.append(String.format("🏫 Lớp: %s | Sĩ số: %s\n",
                    context.data().getOrDefault("className", "—"),
                    context.data().getOrDefault("totalStudents", "—")));
            sb.append(String.format("📅 Hôm nay (%s): Vắng %s | Trễ %s | Phép %s\n",
                    context.data().getOrDefault("date", "—"),
                    context.data().getOrDefault("absentToday", "0"),
                    context.data().getOrDefault("lateToday", "0"),
                    context.data().getOrDefault("excusedToday", "0")));
            if (context.data().containsKey("absentStudents")) {
                sb.append("HS vắng: ").append(context.data().get("absentStudents")).append("\n");
            }
        }

        if (context.intent() == ChatIntent.ASK_QUICK_STATS) {
            sb.append(String.format("🏫 %s — %s\n",
                    context.data().getOrDefault("schoolName", ""),
                    context.data().getOrDefault("date", "")));
            sb.append(String.format("📊 Tổng: %s HS | %s GV | %s lớp\n",
                    context.data().getOrDefault("totalStudents", "—"),
                    context.data().getOrDefault("totalTeachers", "—"),
                    context.data().getOrDefault("totalClasses", "—")));
            if (Boolean.TRUE.equals(context.data().get("hasAttendanceToday"))) {
                sb.append(String.format("📅 Điểm danh hôm nay: Có mặt %s | Vắng %s | Trễ %s | Phép %s\n",
                        context.data().getOrDefault("presentToday", "0"),
                        context.data().getOrDefault("absentToday", "0"),
                        context.data().getOrDefault("lateToday", "0"),
                        context.data().getOrDefault("excusedToday", "0")));
                sb.append("📈 Tỷ lệ đi học: ").append(context.data().getOrDefault("attendanceRate", "—")).append("\n");
            } else {
                sb.append("Chưa có dữ liệu điểm danh hôm nay.\n");
            }
        }

        return sb.isEmpty() ? "Đã nhận được dữ liệu." : sb.toString().trim();
    }

    private void saveLog(UUID userId, String message, ChatIntent intent, String answer) {
        try {
            User user = userRepository.findById(userId).orElse(null);
            if (user != null) {
                ChatMessage log = ChatMessage.builder()
                        .user(user)
                        .message(message)
                        .intent(intent)
                        .response(answer)
                        .build();
                chatMessageRepository.save(log);
            }
        } catch (Exception e) {
            System.err.println("Lỗi lưu chat log: " + e.getMessage());
        }
    }

    private ChatResponse buildResponse(String answer, ChatContext context) {
        return switch (context.status()) {
            case "OK" -> ChatResponse.ok(answer, context.intent());
            case "NEED_CLARIFICATION" ->
                ChatResponse.needClarification(answer, context.intent(), context.studentNames());
            default -> ChatResponse.denied(answer, context.intent());
        };
    }
}
