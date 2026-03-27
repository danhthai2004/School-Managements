package com.schoolmanagement.backend.repo.chat;

import com.schoolmanagement.backend.domain.entity.chat.ChatMessage;
import com.schoolmanagement.backend.domain.entity.auth.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, UUID> {

    /**
     * Lấy lịch sử chat của người dùng, sắp xếp theo thời gian mới nhất.
     */
    List<ChatMessage> findTop20ByUserOrderByCreatedAtDesc(User user);
}
