package com.expense.logger.controller;

import com.expense.logger.dto.UserPasswordUpdateRequestDto;
import com.expense.logger.dto.UserProfileUpdateRequestDto;
import com.expense.logger.dto.UserResponseDto;
import com.expense.logger.exception.ResourceNotFoundException;
import com.expense.logger.model.User;
import com.expense.logger.repository.UserRepository;
import com.expense.logger.service.UserService;
import com.expense.logger.service.AvatarStorageService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.http.HttpHeaders;
import java.nio.file.Files;
import java.io.IOException;
import java.util.Map;
import java.util.UUID;
import java.util.List;
import com.expense.logger.dto.AuditLogResponseDto;
import com.expense.logger.dto.PagedResponseDto;
import com.expense.logger.exception.BadRequestException;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

@RestController
@RequestMapping("/api/v1/users")
public class UserController {

    private final UserService userService;
    private final UserRepository userRepository;
    private final AvatarStorageService avatarStorageService;

    public UserController(UserService userService, UserRepository userRepository, AvatarStorageService avatarStorageService) {
        this.userService = userService;
        this.userRepository = userRepository;
        this.avatarStorageService = avatarStorageService;
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

    @PostMapping(value = "/profile-picture", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<UserResponseDto> uploadProfilePicture(
            Authentication authentication,
            @RequestParam("file") MultipartFile file) {
        UUID userId = getAuthenticatedUserId(authentication);
        UserResponseDto response = userService.uploadProfilePicture(userId, file);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/profile-picture/{filename:.+}")
    public ResponseEntity<Resource> getProfilePicture(@PathVariable String filename) {
        Resource fileResource = avatarStorageService.loadFileAsResource(filename);
        String contentType = null;
        try {
            contentType = Files.probeContentType(fileResource.getFile().toPath());
        } catch (IOException ex) {
            contentType = "application/octet-stream";
        }
        if (contentType == null) {
            contentType = "application/octet-stream";
        }
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + fileResource.getFilename() + "\"")
                .body(fileResource);
    }

    @GetMapping
    @PreAuthorize("hasAuthority('read:user_directories')")
    public ResponseEntity<PagedResponseDto<UserResponseDto>> getAllUsers(
            @RequestParam(required = false) String role,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int pageNumber,
            @RequestParam(defaultValue = "10") int pageSize) {
        
        Pageable pageable = PageRequest.of(pageNumber, pageSize, Sort.by("createdAt").descending());
        PagedResponseDto<UserResponseDto> response = userService.getAllUsers(role, status, search, pageable);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}/role")
    @PreAuthorize("hasAuthority('write:user_management')")
    public ResponseEntity<UserResponseDto> updateUserRole(
            Authentication authentication,
            @PathVariable UUID id,
            @RequestBody Map<String, String> request) {
        UUID adminId = getAuthenticatedUserId(authentication);
        String roleName = request.get("roleName");
        if (roleName == null) {
            throw new BadRequestException("roleName is required");
        }
        UserResponseDto response = userService.updateUserRole(id, roleName, adminId);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}/lock")
    @PreAuthorize("hasAuthority('write:user_management')")
    public ResponseEntity<UserResponseDto> toggleUserLock(
            Authentication authentication,
            @PathVariable UUID id) {
        UUID adminId = getAuthenticatedUserId(authentication);
        UserResponseDto response = userService.toggleUserLock(id, adminId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/audit-logs")
    @PreAuthorize("hasAuthority('read:system_logs')")
    public ResponseEntity<PagedResponseDto<AuditLogResponseDto>> getAuditLogs(
            @RequestParam(required = false) String actionType,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int pageNumber,
            @RequestParam(defaultValue = "20") int pageSize) {
        
        Pageable pageable = PageRequest.of(pageNumber, pageSize, Sort.by("createdAt").descending());
        PagedResponseDto<AuditLogResponseDto> response = userService.getAuditLogs(actionType, search, pageable);
        return ResponseEntity.ok(response);
    }

    private UUID getAuthenticatedUserId(Authentication authentication) {
        User user = userRepository.findByUsernameAndDeletedAtIsNull(authentication.getName())
                .or(() -> userRepository.findByEmailAndDeletedAtIsNull(authentication.getName()))
                .orElseThrow(() -> new ResourceNotFoundException("User context not found"));
        return user.getId();
    }
}
