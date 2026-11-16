package com.dailynotes.auth.user.service;

import com.dailynotes.auth.user.dto.RegisterRequest;
import com.dailynotes.auth.user.dto.UserResponse;
import com.dailynotes.auth.user.entity.UserEntity;
import com.dailynotes.auth.user.repository.UserRepository;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Locale;
import java.util.UUID;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final Logger log = LoggerFactory.getLogger(UserService.class.getName());

    public UserService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public UserResponse registerUser(RegisterRequest request) {
        log.info("User registration started");
        String email = request.email().trim().toLowerCase(Locale.ROOT);
        log.debug("Checking whether email is already registered");

        if (userRepository.findByEmail(email).isPresent()) {
            log.warn("Registration rejected: email already registered");
            throw new IllegalArgumentException("Email is already registered");
        }

        String now = Instant.now().toString();
        UserEntity user = new UserEntity();
        user.setId(UUID.randomUUID().toString());
        user.setEmail(email);
        user.setPasswordHash(
                passwordEncoder.encode(request.password())
        );

        user.setFirstName(request.firstName().trim());
        user.setLastName(request.lastName().trim());
        user.setDisplayName(
                request.firstName().trim() + " " +
                        request.lastName().trim()
        );

        user.setPhoneNumber(request.phoneNumber());
        user.setDateOfBirth(request.dateOfBirth());
        user.setBio(request.bio());

        user.setAccountStatus("ACTIVE");
        user.setCreatedAt(now);
        user.setUpdatedAt(now);

        try {
            userRepository.save(user);

            log.info("User registered successfully. userId={}", user.getId());

        } catch (Exception ex) {
            log.error(
                    "Failed to save user in DynamoDB. userId={}",
                    user.getId(),
                    ex
            );
            throw ex;
        }

        return mapToResponse(user);
    }

    public UserResponse getUserById(String userId) {

        UserEntity user = userRepository.findByUserId(userId)
                .orElseThrow(() ->
                        new IllegalArgumentException("User not found")
                );

        return mapToResponse(user);
    }

    private UserResponse mapToResponse(UserEntity user) {

        return new UserResponse(
                user.getId(),
                user.getEmail(),
                user.getFirstName(),
                user.getLastName(),
                user.getDisplayName(),
                user.getPhoneNumber(),
                user.getProfileImageUrl(),
                user.getBio(),
                user.getDateOfBirth(),
                user.getAccountStatus(),
                user.getCreatedAt(),
                user.getUpdatedAt()
        );
    }
}