package com.expense.logger.dto;

import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
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
    private BigDecimal price;
    private Long categoryId;
    private String categoryName;
    private String categoryColor;
    private LocalDate targetDate;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
