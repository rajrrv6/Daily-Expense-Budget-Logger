package com.expense.logger.controller;

import com.expense.logger.dto.UserPasswordUpdateRequestDto;
import com.expense.logger.dto.UserProfileUpdateRequestDto;
import com.expense.logger.dto.UserResponseDto;
import com.expense.logger.exception.ResourceNotFoundException;
import com.expense.logger.model.User;
import com.expense.logger.repository.UserRepository;
import com.expense.logger.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/users")
public class UserController {

    private final UserService userService;
    private final UserRepository userRepository;

    public UserController(UserService userService, UserRepository userRepository) {
        this.userService = userService;
        this.userRepository = userRepository;
    }

    @PutMapping("/profile")
    public ResponseEntity<UserResponseDto> updateProfile(
            Authentication authentication,
            @Valid @RequestBody UserProfileUpdateRequestDto dto) {
        UUID userId = getAuthenticatedUserId(authentication);
        UserResponseDto response = userService.updateProfile(userId, dto);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/password")
    public ResponseEntity<Map<String, String>> updatePassword(
            Authentication authentication,
            @Valid @RequestBody UserPasswordUpdateRequestDto dto) {
        UUID userId = getAuthenticatedUserId(authentication);
        userService.updatePassword(userId, dto);
        return ResponseEntity.ok(Map.of("message", "Password changed successfully"));
    }

    private UUID getAuthenticatedUserId(Authentication authentication) {
        User user = userRepository.findByUsernameAndDeletedAtIsNull(authentication.getName())
                .or(() -> userRepository.findByEmailAndDeletedAtIsNull(authentication.getName()))
                .orElseThrow(() -> new ResourceNotFoundException("User context not found"));
        return user.getId();
    }
}
