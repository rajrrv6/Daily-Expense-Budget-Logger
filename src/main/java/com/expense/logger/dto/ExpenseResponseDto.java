package com.expense.logger.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExpenseResponseDto {
    private UUID id;
    private String name;
    private BigDecimal amount;
    private LocalDate transactionDate;
    private CategoryResponseDto category;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
