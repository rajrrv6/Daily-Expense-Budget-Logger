package com.expense.logger.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NotificationResponseDto {
    private UUID id;
    private String title;
    private String message;
    private String severity;
    private String category;
    private boolean read;
    private LocalDateTime createdAt;
    private LocalDateTime readAt;
}
