package com.schoolmanagement.backend.controller;

import com.schoolmanagement.backend.dto.ChatResponse;
import com.schoolmanagement.backend.dto.request.ChatRequest;
import com.schoolmanagement.backend.security.UserPrincipal;
import com.schoolmanagement.backend.service.ChatService;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/**
 * Tầng 2 — Chat Controller
 * Chỉ làm 3 việc:
 * 1. Nhận message
 * 2. Lấy userId + role từ JWT (qua UserPrincipal)
 * 3. Gửi xuống ChatService
 */
@RestController
@RequestMapping("/api/chat")
public class ChatbotController {

    private final ChatService chatService;

    public ChatbotController(ChatService chatService) {
        this.chatService = chatService;
    }

    @PostMapping
    public ChatResponse chat(
            @Valid @RequestBody ChatRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        return chatService.process(
                request.message(),
                principal.getId(),
                principal.getRole());
    }
}
