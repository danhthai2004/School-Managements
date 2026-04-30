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
import com.schoolmanagement.backend.domain.entity.auth.User;
import com.schoolmanagement.backend.domain.entity.chat.ChatMessage;
import com.schoolmanagement.backend.dto.chat.ChatContext;
import com.schoolmanagement.backend.dto.chat.ChatResponse;
import com.schoolmanagement.backend.dto.chat.RoutingDecision;
import com.schoolmanagement.backend.repo.chat.ChatMessageRepository;
import com.schoolmanagement.backend.repo.auth.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
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

    private static final Logger log = LoggerFactory.getLogger(ChatService.class);

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
     * Xử lý tin nhắn chat theo luồng mới (Dynamic LLM Routing).
     */
    @Transactional
    public ChatResponse process(String message, UUID userId, Role role) {
        // ──── Lookup User 1 lần duy nhất, tái sử dụng xuyên suốt ────
        User user = userRepository.findById(userId).orElse(null);
        String userName = user != null ? user.getFullName() : "Khách";

        // ──── Bước 1: LLM Dynamic Routing ────
        RoutingDecision decision = intentClassifier.classify(message, userName, role.name());

        // ──── Bước 2: Phân nhánh xử lý ────
        ChatIntent intent = ChatIntent.UNKNOWN;
        String answer;

        if ("SMALL_TALK".equals(decision.routingType()) || "REJECT".equals(decision.routingType())) {
            // Nếu là trò chuyện phiếm hoặc từ chối, lấy luôn câu trả lời từ Router
            answer = decision.reply() != null ? decision.reply() : "Xin lỗi, tôi không thể xử lý yêu cầu này.";
            if ("REJECT".equals(decision.routingType()))
                intent = ChatIntent.OUT_OF_SCOPE;
        } else {
            // Nếu là FUNCTION_CALL (Yêu cầu Data)
            intent = decision.function() != null ? decision.function() : ChatIntent.UNKNOWN;

            // Lấy JSON data từ Handler
            ChatContext context = routeIntent(intent, userId, message, decision.parameters());

            // NlgService xử lý sinh câu trả lời (có AI hoặc fallback tự động)
            boolean isFirstMessage = checkIsFirstMessage(user);
            answer = nlgService.generate(context, message, isFirstMessage, role, isAiEnabled());
        }

        // Trình dọn dẹp cuối cùng: Đảm bảo không bao giờ trả về chuỗi rỗng
        if (answer == null || answer.isBlank() || answer.equals("Không nhận được phản hồi từ AI.")) {
            answer = "Dạ, em đã lấy được dữ liệu nhưng đang gặp chút khó khăn khi diễn đạt. Anh/Chị vui lòng thử lại hoặc hỏi ngắn gọn hơn nhé!";
        }

        // ──── Bước 3: Lưu log & Trả kết quả ────
        saveLog(user, message, intent, answer);

        // Trả về đúng format
        if ("REJECT".equals(decision.routingType())) {
            return ChatResponse.denied(answer, intent);
        }
        return ChatResponse.ok(answer, intent);
    }

    // ═══════════════════════════════════════════════════
    // INTENT ROUTER (Switch-case — không cho AI tự quyết)
    // ═══════════════════════════════════════════════════

    private ChatContext routeIntent(ChatIntent intent, UUID userId, String message,
            java.util.Map<String, String> parameters) {
        return switch (intent) {
            case ASK_SCORE -> scoreHandler.handle(userId, message, parameters);
            case ASK_TIMETABLE -> timetableHandler.handle(userId, message, parameters);
            case ASK_ABSENCE -> attendanceHandler.handle(userId, message, parameters);
            case ASK_ANNOUNCEMENT -> announcementHandler.handle(userId, message, parameters);
            case ASK_TEACHER_TIMETABLE -> teacherTimetableHandler.handle(userId, message, parameters);
            case ASK_HOMEROOM_CLASS -> homeroomHandler.handle(userId, message, parameters);
            case ASK_QUICK_STATS -> quickStatsHandler.handle(userId, message, parameters);
            case UNSUPPORTED_ACTION -> fallbackHandler.handleUnsupported();
            case OUT_OF_SCOPE -> fallbackHandler.handleOutOfScope();
            case UNKNOWN -> fallbackHandler.handle(userId, message, parameters);
        };
    }

    /**
     * Kiểm tra tin nhắn đầu tiên trong phiên (dùng User đã lookup sẵn).
     */
    private boolean checkIsFirstMessage(User user) {
        try {
            if (user == null) return true;
            List<ChatMessage> lastMessages = chatMessageRepository.findTop20ByUserOrderByCreatedAtDesc(user);
            if (lastMessages.isEmpty()) return true;
            ChatMessage latest = lastMessages.get(0);
            Instant fiveMinsAgo = Instant.now().minus(5, ChronoUnit.MINUTES);
            return latest.getCreatedAt().isBefore(fiveMinsAgo);
        } catch (Exception e) {
            log.warn("Lỗi kiểm tra tin nhắn đầu phiên: {}", e.getMessage());
            return true;
        }
    }

    // ═══════════════════════════════════════════════════
    // HELPER METHODS
    // ═══════════════════════════════════════════════════

    /** Kiểm tra AI đã được cấu hình chưa */
    private boolean isAiEnabled() {
        return llmApiKey != null && !llmApiKey.isBlank();
    }

    /**
     * Lưu log chat (dùng User đã lookup sẵn).
     */
    private void saveLog(User user, String message, ChatIntent intent, String answer) {
        try {
            if (user != null) {
                ChatMessage chatLog = ChatMessage.builder()
                        .user(user)
                        .message(message)
                        .intent(intent)
                        .response(answer)
                        .build();
                chatMessageRepository.save(chatLog);
            }
        } catch (Exception e) {
            log.error("Lỗi lưu chat log: {}", e.getMessage());
        }
    }

}
