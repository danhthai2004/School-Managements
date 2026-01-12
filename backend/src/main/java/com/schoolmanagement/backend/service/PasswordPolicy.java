package com.schoolmanagement.backend.service;

import com.schoolmanagement.backend.exception.ApiException;
import org.springframework.http.HttpStatus;

public final class PasswordPolicy {

    private PasswordPolicy() {}

    /**
     * Minimum: 8 characters, with at least 1 uppercase, 1 lowercase, 1 digit, 1 special.
     */
    public static void validateOrThrow(String password) {
        if (password == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Mật khẩu không hợp lệ.");
        }
        if (password.length() < 8) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Mật khẩu phải có ít nhất 8 ký tự.");
        }
        if (!password.matches(".*[A-Z].*")) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Mật khẩu phải có ít nhất 1 chữ hoa.");
        }
        if (!password.matches(".*[a-z].*")) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Mật khẩu phải có ít nhất 1 chữ thường.");
        }
        if (!password.matches(".*\\d.*")) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Mật khẩu phải có ít nhất 1 chữ số.");
        }
        if (!password.matches(".*[^A-Za-z0-9].*")) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Mật khẩu phải có ít nhất 1 ký tự đặc biệt.");
        }
    }
}
