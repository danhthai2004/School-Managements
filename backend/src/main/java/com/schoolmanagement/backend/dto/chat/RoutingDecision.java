package com.schoolmanagement.backend.dto.chat;

import com.schoolmanagement.backend.domain.chat.ChatIntent;

import java.util.Map;

public record RoutingDecision(
                String routingType, // "SMALL_TALK", "FUNCTION_CALL", "REJECT"
                String reply, // Dùng cho SMALL_TALK hoặc REJECT
                ChatIntent function, // Dùng cho FUNCTION_CALL
                Map<String, String> parameters // Tham số bổ sung (vd: timeRange, subjectName)
) {
}
