package com.schoolmanagement.backend.util;

import java.security.SecureRandom;

public final class RandomUtil {

    private static final SecureRandom RNG = new SecureRandom();
    private static final String TEMP_PASSWORD_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*";

    private RandomUtil() {
    }

    public static String generateOtp6() {
        int n = RNG.nextInt(1_000_000);
        return String.format("%06d", n);
    }

    public static String generateTempPassword(int length) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < length; i++) {
            sb.append(TEMP_PASSWORD_CHARS.charAt(RNG.nextInt(TEMP_PASSWORD_CHARS.length())));
        }
        return sb.toString();
    }

    public static String maskEmail(String email) {
        if (email == null || !email.contains("@"))
            return email;
        String[] parts = email.split("@", 2);
        String local = parts[0];
        String domain = parts[1];
        if (local.length() <= 2) {
            return local.charAt(0) + "***@" + domain;
        }
        return local.substring(0, 2) + "***@" + domain;
    }
}
