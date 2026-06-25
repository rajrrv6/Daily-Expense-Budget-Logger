package com.expense.logger.service;

import com.expense.logger.dto.NotificationPreferencesDto;
import com.expense.logger.dto.NotificationResponseDto;
import com.expense.logger.model.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface NotificationCenterService {
    Page<NotificationResponseDto> getNotifications(UUID userId, Pageable pageable);
    long getUnreadCount(UUID userId);
    NotificationResponseDto markAsRead(UUID id, UUID userId);
    void markAllAsRead(UUID userId);
    void deleteNotification(UUID id, UUID userId);
    NotificationPreferencesDto getPreferences(UUID userId);
    NotificationPreferencesDto updatePreferences(UUID userId, NotificationPreferencesDto dto);
    void triggerNotification(User user, String title, String message, String severity, String category);
}
