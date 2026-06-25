package com.expense.logger.dto;

import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TodoResponseDto {
    private UUID id;
    private String name;
    private boolean completed;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
