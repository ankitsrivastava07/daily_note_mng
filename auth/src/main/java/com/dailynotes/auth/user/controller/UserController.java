package com.dailynotes.auth.user.controller;

import com.dailynotes.auth.user.dto.RegisterRequest;
import com.dailynotes.auth.user.dto.UserResponse;
import com.dailynotes.auth.user.service.UserService;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/auth")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @PostMapping("/register")
    public ResponseEntity<UserResponse> registerUser(
            @Valid @RequestBody RegisterRequest request) {

        UserResponse response = userService.registerUser(request);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(response);
    }

    @GetMapping("/profile/{userId}")
    public ResponseEntity<UserResponse> getUserProfile(
            @PathVariable String userId) {

        return ResponseEntity.ok(
                userService.getUserById(userId)
        );
    }
}