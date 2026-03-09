package com.schoolmanagement.backend.controller.auth;

import com.schoolmanagement.backend.dto.common.LoginRequest;
import com.schoolmanagement.backend.dto.auth.GoogleLoginRequest;
import com.schoolmanagement.backend.dto.common.ForgotPasswordRequest;
import com.schoolmanagement.backend.dto.common.ResendOtpRequest;
import com.schoolmanagement.backend.dto.common.VerifyOtpRequest;
import com.schoolmanagement.backend.dto.common.SetPasswordRequest;

import com.schoolmanagement.backend.dto.auth.AuthResponse;
import com.schoolmanagement.backend.dto.chat.MessageResponse;
import com.schoolmanagement.backend.dto.auth.UserDto;
import com.schoolmanagement.backend.dto.auth.VerifyResponse;

import com.schoolmanagement.backend.security.UserPrincipal;
import com.schoolmanagement.backend.service.auth.AuthService;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService auth;

    public AuthController(AuthService auth) {
        this.auth = auth;
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest req) {
        return auth.login(req.email(), req.password());
    }

    @PostMapping("/google")
    public AuthResponse google(@Valid @RequestBody GoogleLoginRequest req) {
        return auth.loginWithGoogle(req.idToken());
    }

    @PostMapping("/forgot-password")
    public AuthResponse forgotPassword(@Valid @RequestBody ForgotPasswordRequest req) {
        return auth.forgotPassword(req.email());
    }

    @PostMapping("/resend-code")
    public MessageResponse resend(@Valid @RequestBody ResendOtpRequest req) {
        auth.resendOtp(UUID.fromString(req.challengeId()));
        return new MessageResponse("Đã gửi lại mã xác minh.");
    }

    @PostMapping("/verify")
    public VerifyResponse verify(@Valid @RequestBody VerifyOtpRequest req) {
        return auth.verifyOtp(UUID.fromString(req.challengeId()), req.code());
    }

    @PostMapping("/set-password")
    public AuthResponse setPassword(@Valid @RequestBody SetPasswordRequest req) {
        return auth.setPassword(req.resetToken(), req.newPassword());
    }

    @GetMapping("/me")
    public UserDto me(@AuthenticationPrincipal UserPrincipal principal) {
        return auth.me(principal.getId());
    }

    @PostMapping("/logout")
    public MessageResponse logout() {
        // JWT is stateless: frontend clears token.
        return new MessageResponse("OK");
    }
}
