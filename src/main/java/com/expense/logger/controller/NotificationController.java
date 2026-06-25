package com.expense.logger.controller;

import com.expense.logger.dto.NotificationPreferencesDto;
import com.expense.logger.dto.NotificationResponseDto;
import com.expense.logger.dto.PagedResponseDto;
import com.expense.logger.exception.ResourceNotFoundException;
import com.expense.logger.model.User;
import com.expense.logger.repository.UserRepository;
import com.expense.logger.service.NotificationCenterService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/notifications")
public class NotificationController {

    private final NotificationCenterService notificationCenterService;
    private final UserRepository userRepository;

    public NotificationController(NotificationCenterService notificationCenterService, UserRepository userRepository) {
        this.notificationCenterService = notificationCenterService;
        this.userRepository = userRepository;
    }

    @GetMapping
    public ResponseEntity<PagedResponseDto<NotificationResponseDto>> getNotifications(
            Authentication authentication,
            Pageable pageable) {
        UUID userId = getAuthenticatedUserId(authentication);
        Page<NotificationResponseDto> page = notificationCenterService.getNotifications(userId, pageable);

        PagedResponseDto<NotificationResponseDto> response = PagedResponseDto.<NotificationResponseDto>builder()
                .content(page.getContent())
                .pageNumber(page.getNumber())
                .pageSize(page.getSize())
                .totalElements(page.getTotalElements())
                .totalPages(page.getTotalPages())
                .isLast(page.isLast())
                .build();

        return ResponseEntity.ok(response);
    }

    @GetMapping("/unread-count")
    public ResponseEntity<Map<String, Long>> getUnreadCount(Authentication authentication) {
        UUID userId = getAuthenticatedUserId(authentication);
        long count = notificationCenterService.getUnreadCount(userId);
        return ResponseEntity.ok(Map.of("unreadCount", count));
    }

    @PutMapping("/{id}/read")
    public ResponseEntity<NotificationResponseDto> markAsRead(
            Authentication authentication,
            @PathVariable UUID id) {
        UUID userId = getAuthenticatedUserId(authentication);
        return ResponseEntity.ok(notificationCenterService.markAsRead(id, userId));
    }

    @PutMapping("/read-all")
    public ResponseEntity<Map<String, String>> markAllAsRead(Authentication authentication) {
        UUID userId = getAuthenticatedUserId(authentication);
        notificationCenterService.markAllAsRead(userId);
        return ResponseEntity.ok(Map.of("message", "All notifications marked as read"));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteNotification(
            Authentication authentication,
            @PathVariable UUID id) {
        UUID userId = getAuthenticatedUserId(authentication);
        notificationCenterService.deleteNotification(id, userId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/preferences")
    public ResponseEntity<NotificationPreferencesDto> getPreferences(Authentication authentication) {
        UUID userId = getAuthenticatedUserId(authentication);
        return ResponseEntity.ok(notificationCenterService.getPreferences(userId));
    }

    @PutMapping("/preferences")
    public ResponseEntity<NotificationPreferencesDto> updatePreferences(
            Authentication authentication,
            @Valid @RequestBody NotificationPreferencesDto dto) {
        UUID userId = getAuthenticatedUserId(authentication);
        return ResponseEntity.ok(notificationCenterService.updatePreferences(userId, dto));
    }

    private UUID getAuthenticatedUserId(Authentication authentication) {
        User user = userRepository.findByUsernameAndDeletedAtIsNull(authentication.getName())
                .or(() -> userRepository.findByEmailAndDeletedAtIsNull(authentication.getName()))
                .orElseThrow(() -> new ResourceNotFoundException("User context not found"));
        return user.getId();
    }
}
