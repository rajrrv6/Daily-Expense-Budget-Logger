package com.expense.logger.service;

import com.expense.logger.dto.UserPasswordUpdateRequestDto;
import com.expense.logger.dto.UserProfileUpdateRequestDto;
import com.expense.logger.dto.UserResponseDto;
import com.expense.logger.exception.BadRequestException;
import com.expense.logger.exception.ResourceNotFoundException;
import com.expense.logger.model.AuditLog;
import com.expense.logger.model.User;
import com.expense.logger.repository.AuditLogRepository;
import com.expense.logger.repository.RefreshTokenRepository;
import com.expense.logger.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.UUID;

@Service
@Transactional
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final RefreshTokenRepository refreshTokenRepository;
    private final AuditLogRepository auditLogRepository;

    public UserServiceImpl(UserRepository userRepository,
                           PasswordEncoder passwordEncoder,
                           RefreshTokenRepository refreshTokenRepository,
                           AuditLogRepository auditLogRepository) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.refreshTokenRepository = refreshTokenRepository;
        this.auditLogRepository = auditLogRepository;
    }

    @Override
    public UserResponseDto updateProfile(UUID userId, UserProfileUpdateRequestDto dto) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));

        // Check if new email is taken by another user
        Optional<User> existingEmailUser = userRepository.findByEmailAndDeletedAtIsNull(dto.getEmail());
        if (existingEmailUser.isPresent() && !existingEmailUser.get().getId().equals(userId)) {
            throw new BadRequestException("Email is already taken");
        }

        // Check if new username is taken by another user
        Optional<User> existingUsernameUser = userRepository.findByUsernameAndDeletedAtIsNull(dto.getUsername());
        if (existingUsernameUser.isPresent() && !existingUsernameUser.get().getId().equals(userId)) {
            throw new BadRequestException("Username is already taken");
        }

        user.setUsername(dto.getUsername());
        user.setEmail(dto.getEmail());
        user.setFirstName(dto.getFirstName());
        user.setLastName(dto.getLastName());
        user.setPhoneNumber(dto.getPhoneNumber());
        user.setMonthlyIncome(dto.getMonthlyIncome());
        userRepository.save(user);

        // Audit Logging
        logEvent("PROFILE_UPDATE", "User updated profile details. Username: " + user.getUsername(), user);

        return UserResponseDto.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .phoneNumber(user.getPhoneNumber())
                .monthlyIncome(user.getMonthlyIncome())
                .createdAt(user.getCreatedAt())
                .build();
    }

    @Override
    public void updatePassword(UUID userId, UserPasswordUpdateRequestDto dto) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));

        // Verify current password
        if (!passwordEncoder.matches(dto.getCurrentPassword(), user.getPasswordHash())) {
            throw new BadRequestException("Invalid current password");
        }

        // Update password hash
        user.setPasswordHash(passwordEncoder.encode(dto.getNewPassword()));
        userRepository.save(user);

        // Invalidate all active refresh tokens for the user
        refreshTokenRepository.deleteByUser(user);

        // Audit Logging
        logEvent("PASSWORD_CHANGE", "User successfully changed password.", user);
    }

    private void logEvent(String actionType, String description, User user) {
        AuditLog auditLog = AuditLog.builder()
                .actionType(actionType)
                .description(description)
                .user(user)
                .build();
        auditLogRepository.save(auditLog);
    }
}
