package com.schoolmanagement.backend.service.notification;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.scheduling.annotation.Async;

@Slf4j
@Service
public class MailService {

    private final JavaMailSender mailSender;
    private final String from;
    private final String username;
    private final String appPassword;

    public MailService(
            JavaMailSender mailSender,
            @Value("${spring.mail.username:}") String username,
            @Value("${spring.mail.password:}") String appPassword,
            @Value("${app.mail.from:}") String from
    ) {
        this.mailSender = mailSender;
        this.username = username;
        this.appPassword = appPassword;
        this.from = (from == null || from.isBlank()) ? username : from;
        
        if (mailConfigured()) {
            log.info("[MAIL SERVICE] Initialized with username: {}", username);
        } else {
            log.warn("[MAIL SERVICE] Initialized without credentials. Emails will not be sent.");
        }
    }

    private boolean mailConfigured() {
        return username != null && !username.isBlank() && appPassword != null && !appPassword.isBlank();
    }

    @Async
    public void sendOtpEmail(String to, String otp, String purpose) {
        if (!mailConfigured()) {
            log.warn("[MAIL NOT CONFIGURED] OTP for {} ({}) = {}", to, purpose, otp);
            return;
        }
        try {
            SimpleMailMessage msg = new SimpleMailMessage();
            msg.setFrom(from);
            msg.setTo(to);
            msg.setSubject("[School Management] Mã xác minh");
            msg.setText("Mã xác minh của bạn là: " + otp + "\n\nMục đích: " + purpose + "\nMã sẽ hết hạn sau 5 phút.");
            mailSender.send(msg);
            log.info("[MAIL SENT] OTP to {}", to);
        } catch (Exception e) {
            log.error("[MAIL FAILED] Failed to send OTP to {}: {}", to, e.getMessage());
        }
    }

    @Async
    public void sendTempPasswordEmail(String to, String fullName, String tempPassword) {
        if (!mailConfigured()) {
            log.warn("[MAIL NOT CONFIGURED] Temp password for {} = {}", to, tempPassword);
            return;
        }
        try {
            SimpleMailMessage msg = new SimpleMailMessage();
            msg.setFrom(from);
            msg.setTo(to);
            msg.setSubject("[School Management] Tài khoản của bạn");
            msg.setText("Xin chào " + fullName + ",\n\n"
                    + "Tài khoản của bạn đã được tạo.\n"
                    + "Email đăng nhập: " + to + "\n"
                    + "Mật khẩu tạm thời: " + tempPassword + "\n\n"
                    + "Vui lòng đăng nhập và đổi mật khẩu ở lần đăng nhập đầu tiên.");
            mailSender.send(msg);
            log.info("[MAIL SENT] Temp password to {}", to);
        } catch (Exception e) {
            log.error("[MAIL FAILED] Failed to send temp password to {}: {}", to, e.getMessage());
        }
    }
}
