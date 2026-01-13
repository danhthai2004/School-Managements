package com.schoolmanagement.backend.service;

import com.schoolmanagement.backend.domain.AuthChallengeType;
import com.schoolmanagement.backend.domain.Role;
import com.schoolmanagement.backend.domain.entity.AuthChallenge;
import com.schoolmanagement.backend.domain.entity.User;
import com.schoolmanagement.backend.dto.AuthResponse;
import com.schoolmanagement.backend.dto.UserDto;
import com.schoolmanagement.backend.dto.VerifyResponse;
import com.schoolmanagement.backend.exception.ApiException;
import com.schoolmanagement.backend.repo.AuthChallengeRepository;
import com.schoolmanagement.backend.repo.UserRepository;
import com.schoolmanagement.backend.security.JwtService;
import com.schoolmanagement.backend.security.TokenKind;
import io.jsonwebtoken.JwtException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

@Slf4j
@Service
public class AuthService {

    private static final int OTP_MAX_ATTEMPTS = 5;

    private final UserRepository users;
    private final AuthChallengeRepository challenges;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwt;
    private final MailService mailService;
    private final GoogleIdTokenService googleIdTokenService;

    public AuthService(
            UserRepository users,
            AuthChallengeRepository challenges,
            PasswordEncoder passwordEncoder,
            JwtService jwt,
            MailService mailService,
            GoogleIdTokenService googleIdTokenService
    ) {
        this.users = users;
        this.challenges = challenges;
        this.passwordEncoder = passwordEncoder;
        this.jwt = jwt;
        this.mailService = mailService;
        this.googleIdTokenService = googleIdTokenService;
    }

    public AuthResponse login(String email, String password) {
        var user = users.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Email hoặc mật khẩu không đúng."));

        if (!user.isEnabled()) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Tài khoản bị vô hiệu hoá.");
        }
        if (!passwordEncoder.matches(password, user.getPasswordHash())) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Email hoặc mật khẩu không đúng.");
        }

        if (requiresFirstLoginFlow(user)) {
            var challenge = createOtpChallenge(user, AuthChallengeType.FIRST_LOGIN);
            return new AuthResponse(
                    "OTP_REQUIRED",
                    null,
                    null,
                    challenge.getId().toString(),
                    RandomUtil.maskEmail(user.getEmail()),
                    "Vui lòng nhập mã xác minh."
            );
        }

        return authenticatedResponse(user);
    }

    public AuthResponse loginWithGoogle(String idTokenString) {
        var payload = googleIdTokenService.verify(idTokenString);
        String email = payload.getEmail();
        if (email == null || email.isBlank()) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Google token không hợp lệ.");
        }

        var userOpt = users.findByEmailIgnoreCase(email);
        if (userOpt.isEmpty()) {
            throw new ApiException(HttpStatus.FORBIDDEN,
                    "tài khoản của bạn không thuộc hệ sinh thái, vui lòng liên hệ quản trị viên");
        }
        var user = userOpt.get();
        if (!user.isEnabled()) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Tài khoản bị vô hiệu hoá.");
        }

        if (requiresFirstLoginFlow(user)) {
            var challenge = createOtpChallenge(user, AuthChallengeType.FIRST_LOGIN);
            return new AuthResponse(
                    "OTP_REQUIRED",
                    null,
                    null,
                    challenge.getId().toString(),
                    RandomUtil.maskEmail(user.getEmail()),
                    "Vui lòng nhập mã xác minh."
            );
        }

        return authenticatedResponse(user);
    }

    public AuthResponse forgotPassword(String email) {
        var user = users.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Email không tồn tại trong hệ thống."));

        if (!user.isEnabled()) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Tài khoản bị vô hiệu hoá.");
        }

        var challenge = createOtpChallenge(user, AuthChallengeType.FORGOT_PASSWORD);
        return new AuthResponse(
                "OTP_REQUIRED",
                null,
                null,
                challenge.getId().toString(),
                RandomUtil.maskEmail(user.getEmail()),
                "Vui lòng nhập mã xác minh."
        );
    }

    public void resendOtp(UUID challengeId) {
        var existing = challenges.findById(challengeId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Yêu cầu xác minh không tồn tại."));
        var user = existing.getUser();
        if (!user.isEnabled()) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Tài khoản bị vô hiệu hoá.");
        }
        // Create a fresh challenge to reset attempts/expiry.
        createOtpChallenge(user, existing.getType());
    }

    public VerifyResponse verifyOtp(UUID challengeId, String code) {
        var now = Instant.now();
        var challenge = challenges.findById(challengeId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Yêu cầu xác minh không tồn tại."));

        if (challenge.isConsumed()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Mã xác minh đã được sử dụng.");
        }
        if (challenge.isExpired(now)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Mã xác minh đã hết hạn.");
        }
        if (challenge.getAttempts() >= OTP_MAX_ATTEMPTS) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Bạn đã nhập sai quá nhiều lần.");
        }

        boolean ok = passwordEncoder.matches(code, challenge.getCodeHash());
        if (!ok) {
            challenge.setAttempts(challenge.getAttempts() + 1);
            challenges.save(challenge);
            throw new ApiException(HttpStatus.BAD_REQUEST, "Mã xác minh không đúng.");
        }

        challenge.setVerifiedAt(now);
        challenges.save(challenge);

        String resetToken = jwt.issueResetToken(challenge.getUser().getId(), challenge.getId());
        return new VerifyResponse(resetToken);
    }

    public AuthResponse setPassword(String resetToken, String newPassword) {
        try {
            if (jwt.getKind(resetToken) != TokenKind.RESET) {
                throw new ApiException(HttpStatus.UNAUTHORIZED, "Token không hợp lệ.");
            }
        } catch (JwtException ex) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Token không hợp lệ hoặc đã hết hạn.");
        }

        UUID userId = jwt.requireSubjectUserId(resetToken);
        UUID challengeId = jwt.getChallengeId(resetToken);
        if (challengeId == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Token không hợp lệ.");
        }

        var now = Instant.now();
        var challenge = challenges.findById(challengeId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Yêu cầu xác minh không tồn tại."));

        if (!challenge.getUser().getId().equals(userId)) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Token không hợp lệ.");
        }
        if (challenge.isConsumed()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Yêu cầu đã được sử dụng.");
        }
        if (challenge.isExpired(now)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Mã xác minh đã hết hạn.");
        }
        if (!challenge.isVerified()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Bạn chưa xác minh mã OTP.");
        }

        PasswordPolicy.validateOrThrow(newPassword);

        var user = challenge.getUser();
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        if (user.getRole() != Role.SYSTEM_ADMIN) {
            user.setFirstLogin(false);
        }
        users.save(user);

        challenge.setConsumedAt(now);
        challenges.save(challenge);

        return authenticatedResponse(user);
    }

    public UserDto me(UUID userId) {
        var user = users.findById(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));
        return toDto(user);
    }

    private boolean requiresFirstLoginFlow(User user) {
        return user.getRole() != Role.SYSTEM_ADMIN && user.isFirstLogin();
    }

    private AuthResponse authenticatedResponse(User user) {
        String token = jwt.issueAccessToken(user);
        return new AuthResponse(
                "AUTHENTICATED",
                token,
                toDto(user),
                null,
                null,
                "Đăng nhập thành công."
        );
    }

    private AuthChallenge createOtpChallenge(User user, AuthChallengeType type) {
        String otp = RandomUtil.generateOtp6();
        String hash = passwordEncoder.encode(otp);

        var now = Instant.now();
        var challenge = AuthChallenge.builder()
                .user(user)
                .type(type)
                .codeHash(hash)
                .attempts(0)
                .expiresAt(now.plus(5, ChronoUnit.MINUTES))
                .build();
        challenge = challenges.save(challenge);

        String purpose = (type == AuthChallengeType.FIRST_LOGIN) ? "Đăng nhập lần đầu" : "Quên mật khẩu";
        mailService.sendOtpEmail(user.getEmail(), otp, purpose);

        log.info("OTP challenge created: id={} email={} type={}", challenge.getId(), user.getEmail(), type);
        return challenge;
    }

    private UserDto toDto(User user) {
        UUID schoolId = user.getSchool() != null ? user.getSchool().getId() : null;
        String schoolCode = user.getSchool() != null ? user.getSchool().getCode() : null;
        return new UserDto(user.getId(), user.getEmail(), user.getFullName(), user.getRole(), schoolId, schoolCode);
    }
}
