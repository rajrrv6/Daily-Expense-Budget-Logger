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

import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import com.expense.logger.model.Role;
import com.expense.logger.repository.RoleRepository;
import com.expense.logger.dto.AuditLogResponseDto;
import com.expense.logger.dto.PagedResponseDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

@Service
@Transactional
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final RefreshTokenRepository refreshTokenRepository;
    private final AuditLogRepository auditLogRepository;
    private final AvatarStorageService avatarStorageService;
    private final RoleRepository roleRepository;

    public UserServiceImpl(UserRepository userRepository,
                           PasswordEncoder passwordEncoder,
                           RefreshTokenRepository refreshTokenRepository,
                           AuditLogRepository auditLogRepository,
                           AvatarStorageService avatarStorageService,
                           RoleRepository roleRepository) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.refreshTokenRepository = refreshTokenRepository;
        this.auditLogRepository = auditLogRepository;
        this.avatarStorageService = avatarStorageService;
        this.roleRepository = roleRepository;
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
                .profilePicturePath(user.getProfilePicturePath())
                .createdAt(user.getCreatedAt())
                .roles(user.getRoles() != null ? user.getRoles().stream().map(Role::getName).collect(Collectors.toSet()) : Set.of())
                .locked(user.getLockoutUntil() != null && user.getLockoutUntil().isAfter(java.time.LocalDateTime.now()))
                .build();
    }

    @Override
    public UserResponseDto uploadProfilePicture(UUID userId, org.springframework.web.multipart.MultipartFile file) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));

        // Store new file
        String fileName = avatarStorageService.storeFile(file);

        // Delete old file if present
        if (user.getProfilePicturePath() != null) {
            avatarStorageService.deleteFile(user.getProfilePicturePath());
        }

        // Save reference
        user.setProfilePicturePath(fileName);
        userRepository.save(user);

        // Log audit event
        logEvent("PROFILE_PICTURE_UPLOAD", "User uploaded a new profile picture.", user);

        return UserResponseDto.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .phoneNumber(user.getPhoneNumber())
                .monthlyIncome(user.getMonthlyIncome())
                .profilePicturePath(user.getProfilePicturePath())
                .createdAt(user.getCreatedAt())
                .roles(user.getRoles() != null ? user.getRoles().stream().map(Role::getName).collect(Collectors.toSet()) : Set.of())
                .locked(user.getLockoutUntil() != null && user.getLockoutUntil().isAfter(java.time.LocalDateTime.now()))
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

        // Hash new password
        user.setPasswordHash(passwordEncoder.encode(dto.getNewPassword()));
        userRepository.save(user);

        // Invalidate all active refresh tokens for the user
        refreshTokenRepository.deleteByUser(user);

        // Audit Logging
        logEvent("PASSWORD_CHANGE", "User successfully changed password.", user);
    }

    @Override
    @Transactional(readOnly = true)
    public PagedResponseDto<UserResponseDto> getAllUsers(String role, String status, String search, Pageable pageable) {
        String searchParam = (search == null || search.trim().isEmpty()) ? null : "%" + search.trim().toLowerCase() + "%";
        Page<User> result = userRepository.findUsersFiltered(role, status, searchParam, pageable);
        List<UserResponseDto> content = result.getContent().stream()
                .map(user -> UserResponseDto.builder()
                        .id(user.getId())
                        .username(user.getUsername())
                        .email(user.getEmail())
                        .firstName(user.getFirstName())
                        .lastName(user.getLastName())
                        .phoneNumber(user.getPhoneNumber())
                        .monthlyIncome(user.getMonthlyIncome())
                        .profilePicturePath(user.getProfilePicturePath())
                        .createdAt(user.getCreatedAt())
                        .roles(user.getRoles() != null ? user.getRoles().stream().map(Role::getName).collect(Collectors.toSet()) : Set.of())
                        .locked(user.getLockoutUntil() != null && user.getLockoutUntil().isAfter(java.time.LocalDateTime.now()))
                        .build())
                .collect(Collectors.toList());

        return PagedResponseDto.<UserResponseDto>builder()
                .content(content)
                .pageNumber(result.getNumber())
                .pageSize(result.getSize())
                .totalElements(result.getTotalElements())
                .totalPages(result.getTotalPages())
                .isLast(result.isLast())
                .build();
    }

    @Override
    public UserResponseDto updateUserRole(UUID userId, String roleName, UUID adminId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));

        User admin = userRepository.findById(adminId)
                .orElseThrow(() -> new ResourceNotFoundException("Admin context not found"));

        Role targetRole = roleRepository.findByName(roleName)
                .orElseThrow(() -> new ResourceNotFoundException("Role not found: " + roleName));

        Set<Role> roles = new java.util.HashSet<>();
        roles.add(targetRole);
        user.setRoles(roles);
        userRepository.save(user);

        // Invalidate active sessions so they get the new token immediately
        refreshTokenRepository.deleteByUser(user);

        logEvent("RBAC_ROLE_CHANGE", "Admin " + admin.getUsername() + " changed role of " + user.getUsername() + " to " + roleName, admin);

        return UserResponseDto.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .phoneNumber(user.getPhoneNumber())
                .monthlyIncome(user.getMonthlyIncome())
                .profilePicturePath(user.getProfilePicturePath())
                .createdAt(user.getCreatedAt())
                .roles(user.getRoles().stream().map(Role::getName).collect(Collectors.toSet()))
                .locked(user.getLockoutUntil() != null && user.getLockoutUntil().isAfter(java.time.LocalDateTime.now()))
                .build();
    }

    @Override
    public UserResponseDto toggleUserLock(UUID userId, UUID adminId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));

        User admin = userRepository.findById(adminId)
                .orElseThrow(() -> new ResourceNotFoundException("Admin context not found"));

        boolean isLocked = user.getLockoutUntil() != null && user.getLockoutUntil().isAfter(java.time.LocalDateTime.now());
        if (isLocked) {
            user.setLockoutUntil(null);
            user.setFailedLoginAttempts(0);
            logEvent("USER_UNLOCK", "Admin " + admin.getUsername() + " unlocked user " + user.getUsername(), admin);
        } else {
            user.setLockoutUntil(java.time.LocalDateTime.now().plusYears(100));
            logEvent("USER_LOCK", "Admin " + admin.getUsername() + " locked user " + user.getUsername(), admin);
            refreshTokenRepository.deleteByUser(user);
        }
        userRepository.save(user);

        return UserResponseDto.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .phoneNumber(user.getPhoneNumber())
                .monthlyIncome(user.getMonthlyIncome())
                .profilePicturePath(user.getProfilePicturePath())
                .createdAt(user.getCreatedAt())
                .roles(user.getRoles().stream().map(Role::getName).collect(Collectors.toSet()))
                .locked(user.getLockoutUntil() != null && user.getLockoutUntil().isAfter(java.time.LocalDateTime.now()))
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public PagedResponseDto<AuditLogResponseDto> getAuditLogs(String actionType, String search, Pageable pageable) {
        String searchParam = (search == null || search.trim().isEmpty()) ? null : "%" + search.trim().toLowerCase() + "%";
        Page<AuditLog> result = auditLogRepository.findLogsFiltered(actionType, searchParam, pageable);
        List<AuditLogResponseDto> content = result.getContent().stream()
                .map(log -> AuditLogResponseDto.builder()
                        .id(log.getId())
                        .actionType(log.getActionType())
                        .description(log.getDescription())
                        .username(log.getUser() != null ? log.getUser().getUsername() : "SYSTEM")
                        .createdAt(log.getCreatedAt())
                        .build())
                .collect(Collectors.toList());

        return PagedResponseDto.<AuditLogResponseDto>builder()
                .content(content)
                .pageNumber(result.getNumber())
                .pageSize(result.getSize())
                .totalElements(result.getTotalElements())
                .totalPages(result.getTotalPages())
                .isLast(result.isLast())
                .build();
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
