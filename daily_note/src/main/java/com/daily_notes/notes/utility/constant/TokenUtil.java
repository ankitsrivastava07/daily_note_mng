package com.daily_notes.notes.utility.constant;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.Locale;

public class TokenUtil {

    public static String generateToken(String userId, String name) {
        String input = userId + ":" + normalize(name);

        try {
            byte[] hash = MessageDigest.getInstance("SHA-256")
                    .digest(input.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("Unable to generate task token.", e);
        }
    }

    public static String normalize(String name) {
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("Task name is required.");
        }
        return name.trim()
                .replaceAll("\\s+", " ")
                .toLowerCase(Locale.ROOT);
    }
}
