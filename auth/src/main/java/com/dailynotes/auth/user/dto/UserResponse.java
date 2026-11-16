package com.dailynotes.auth.user.dto;

public record UserResponse(
        String userId,
        String email,
        String firstName,
        String lastName,
        String displayName,
        String phoneNumber,
        String profileImageUrl,
        String bio,
        String dateOfBirth,
        String accountStatus,
        String createdAt,
        String updatedAt
) {}