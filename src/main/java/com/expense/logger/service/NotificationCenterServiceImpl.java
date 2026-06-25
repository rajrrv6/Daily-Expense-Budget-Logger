package com.expense.logger.service;

import com.expense.logger.dto.NotificationPreferencesDto;
import com.expense.logger.dto.NotificationResponseDto;
import com.expense.logger.exception.ResourceNotFoundException;
import com.expense.logger.model.Notification;
import com.expense.logger.model.NotificationPreferences;
import com.expense.logger.model.User;
import com.expense.logger.repository.NotificationPreferencesRepository;
import com.expense.logger.repository.NotificationRepository;
import com.expense.logger.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class NotificationCenterServiceImpl implements NotificationCenterService {

    private final NotificationRepository notificationRepository;
    private final NotificationPreferencesRepository preferencesRepository;
    private final UserRepository userRepository;

    public NotificationCenterServiceImpl(NotificationRepository notificationRepository,
                                         NotificationPreferencesRepository preferencesRepository,
                                         UserRepository userRepository) {
        this.notificationRepository = notificationRepository;
        this.preferencesRepository = preferencesRepository;
        this.userRepository = userRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public Page<NotificationResponseDto> getNotifications(UUID userId, Pageable pageable) {
        return notificationRepository.findAllByUserIdAndDeletedAtIsNull(userId, pageable)
                .map(this::mapToDto);
    }

    @Override
    @Transactional(readOnly = true)
    public long getUnreadCount(UUID userId) {
        return notificationRepository.countByUserIdAndReadFalseAndDeletedAtIsNull(userId);
    }

    @Override
    public NotificationResponseDto markAsRead(UUID id, UUID userId) {
        Notification notification = notificationRepository.findByIdAndUserIdAndDeletedAtIsNull(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found with id: " + id));

        if (!notification.isRead()) {
            notification.setRead(true);
            notification.setReadAt(LocalDateTime.now());
            notificationRepository.save(notification);
        }
        return mapToDto(notification);
    }

    @Override
    public void markAllAsRead(UUID userId) {
        List<Notification> unread = notificationRepository.findAllByUserIdAndReadFalseAndDeletedAtIsNull(userId);
        LocalDateTime now = LocalDateTime.now();
        for (Notification n : unread) {
            n.setRead(true);
            n.setReadAt(now);
        }
        notificationRepository.saveAll(unread);
    }

    @Override
    public void deleteNotification(UUID id, UUID userId) {
        Notification notification = notificationRepository.findByIdAndUserIdAndDeletedAtIsNull(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found with id: " + id));

        notification.setDeletedAt(LocalDateTime.now());
        notificationRepository.save(notification);
    }

    @Override
    public NotificationPreferencesDto getPreferences(UUID userId) {
        NotificationPreferences prefs = preferencesRepository.findById(userId)
                .orElseGet(() -> createDefaultPreferences(userId));
        return mapToPrefsDto(prefs);
    }

    @Override
    public NotificationPreferencesDto updatePreferences(UUID userId, NotificationPreferencesDto dto) {
        NotificationPreferences prefs = preferencesRepository.findById(userId)
                .orElseGet(() -> createDefaultPreferences(userId));

        prefs.setBudgetWarningsEnabled(dto.isBudgetWarningsEnabled());
        prefs.setSystemAlertsEnabled(dto.isSystemAlertsEnabled());
        prefs.setQuietHoursEnabled(dto.isQuietHoursEnabled());
        prefs.setQuietHoursStart(dto.getQuietHoursStart());
        prefs.setQuietHoursEnd(dto.getQuietHoursEnd());

        preferencesRepository.save(prefs);
        return mapToPrefsDto(prefs);
    }

    @Override
    public void triggerNotification(User user, String title, String message, String severity, String category) {
        NotificationPreferences prefs = preferencesRepository.findById(user.getId())
                .orElseGet(() -> createDefaultPreferences(user.getId()));

        // Check if category is enabled
        if ("BUDGET_WARNING".equalsIgnoreCase(category) && !prefs.isBudgetWarningsEnabled()) {
            return;
        }
        if ("SYSTEM".equalsIgnoreCase(category) && !prefs.isSystemAlertsEnabled()) {
            return;
        }

        // Check quiet hours
        if (isInQuietHours(prefs)) {
            return; // Skip alerting/persisting during quiet hours
        }

        Notification notification = Notification.builder()
                .user(user)
                .title(title)
                .message(message)
                .severity(severity)
                .category(category)
                .read(false)
                .build();

        notificationRepository.save(notification);
    }

    private NotificationPreferences createDefaultPreferences(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));

        NotificationPreferences prefs = NotificationPreferences.builder()
                .user(user)
                .budgetWarningsEnabled(true)
                .systemAlertsEnabled(true)
                .quietHoursEnabled(false)
                .build();
        return preferencesRepository.save(prefs);
    }

    private boolean isInQuietHours(NotificationPreferences prefs) {
        if (prefs == null || !prefs.isQuietHoursEnabled() || prefs.getQuietHoursStart() == null || prefs.getQuietHoursEnd() == null) {
            return false;
        }
        LocalTime now = LocalTime.now();
        LocalTime start = prefs.getQuietHoursStart();
        LocalTime end = prefs.getQuietHoursEnd();
        if (start.isBefore(end)) {
            return now.isAfter(start) && now.isBefore(end);
        } else {
            return now.isAfter(start) || now.isBefore(end);
        }
    }

    private NotificationResponseDto mapToDto(Notification n) {
        return NotificationResponseDto.builder()
                .id(n.getId())
                .title(n.getTitle())
                .message(n.getMessage())
                .severity(n.getSeverity())
                .category(n.getCategory())
                .read(n.isRead())
                .createdAt(n.getCreatedAt())
                .readAt(n.getReadAt())
                .build();
    }

    private NotificationPreferencesDto mapToPrefsDto(NotificationPreferences p) {
        return NotificationPreferencesDto.builder()
                .budgetWarningsEnabled(p.isBudgetWarningsEnabled())
                .systemAlertsEnabled(p.isSystemAlertsEnabled())
                .quietHoursEnabled(p.isQuietHoursEnabled())
                .quietHoursStart(p.getQuietHoursStart())
                .quietHoursEnd(p.getQuietHoursEnd())
                .build();
    }
}
