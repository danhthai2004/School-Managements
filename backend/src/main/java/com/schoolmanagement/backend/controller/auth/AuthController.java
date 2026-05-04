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
import com.schoolmanagement.backend.dto.request.auth.ChangePasswordRequest;
import com.schoolmanagement.backend.dto.request.auth.UpdateProfileRequest;
import com.schoolmanagement.backend.security.UserPrincipal;
import com.schoolmanagement.backend.service.auth.AuthService;
import com.schoolmanagement.backend.service.auth.MobileOAuthService;
import org.springframework.http.ResponseEntity;

import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.UUID;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService auth;
    private final MobileOAuthService mobileOAuth;

    public AuthController(AuthService auth, MobileOAuthService mobileOAuth) {
        this.auth = auth;
        this.mobileOAuth = mobileOAuth;
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest req) {
        return auth.login(req.email(), req.password());
    }

    @PostMapping("/google")
    public AuthResponse google(@Valid @RequestBody GoogleLoginRequest req) {
        return auth.loginWithGoogle(req.idToken());
    }

    // ── Mobile OAuth (Expo Go) ──────────────────────────────────────────────

    /**
     * Step 1: Mobile opens this URL in WebBrowser → redirects to Google OAuth.
     * GET /api/auth/google/mobile/start?sessionId=UUID
     */
    @GetMapping("/google/mobile/start")
    public void mobileOAuthStart(
            @RequestParam String sessionId,
            HttpServletResponse response) throws IOException {
        String googleUrl = mobileOAuth.buildGoogleAuthUrl(sessionId);
        response.sendRedirect(googleUrl);
    }

    /**
     * Step 2: Google redirects here after user authenticates.
     * GET /api/auth/google/mobile/callback?code=...&state=sessionId
     */
    @GetMapping("/google/mobile/callback")
    public void mobileOAuthCallback(
            @RequestParam(required = false) String code,
            @RequestParam(required = false) String state,
            @RequestParam(required = false) String error,
            HttpServletResponse response) throws IOException {
        if (error != null || code == null || state == null) {
            response.sendRedirect(
                    "https://rhinological-izabella-superbusily.ngrok-free.dev/api/auth/google/mobile/done?error=cancelled");
            return;
        }
        mobileOAuth.handleCallback(code, state);
        // Show success page - mobile is polling
        response.setContentType("text/html;charset=UTF-8");
        response.getWriter().write("""
                <!DOCTYPE html><html><head><meta charset='utf-8'>
                <meta name='viewport' content='width=device-width,initial-scale=1'>
                <title>Đăng nhập thành công</title>
                <style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;
                height:100vh;margin:0;background:#1d4ed8;color:#fff;text-align:center;padding:20px}</style>
                </head><body>
                <div><h2>✅ Đăng nhập thành công!</h2>
                <p>Quay lại ứng dụng để tiếp tục.</p>
                <p style='font-size:14px;opacity:.7'>Bạn có thể đóng trang này.</p></div>
                </body></html>
                """);
    }

    /**
     * Step 3: Mobile polls this endpoint until JWT is ready.
     * GET /api/auth/google/mobile/poll?sessionId=UUID
     * Returns 204 if still pending, 200+body if done, 401 if error.
     */
    @GetMapping("/google/mobile/poll")
    public ResponseEntity<?> mobileOAuthPoll(@RequestParam String sessionId) {
        AuthResponse result = mobileOAuth.poll(sessionId);
        if (result == null) {
            // Still pending
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(result);
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

    @PutMapping("/profile")
    public UserDto updateProfile(@AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody UpdateProfileRequest req) {
        return auth.updateProfile(principal.getId(), req);
    }

    @PutMapping("/change-password")
    public MessageResponse changePassword(@AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody ChangePasswordRequest req) {
        return auth.changePassword(principal.getId(), req.currentPassword(), req.newPassword());
    }

    @PostMapping("/logout")
    public MessageResponse logout(HttpServletRequest request) {
        auth.logoutCurrentDevice(request);
        return new MessageResponse("Đã đăng xuất khỏi thiết bị này.");
    }

    @PostMapping("/logout-other-devices")
    public MessageResponse logoutOtherDevices(@AuthenticationPrincipal UserPrincipal principal,
            HttpServletRequest request) {
        auth.logoutOtherDevices(principal.getId(), request);
        return new MessageResponse("Đã đăng xuất khỏi các thiết bị khác.");
    }

}
