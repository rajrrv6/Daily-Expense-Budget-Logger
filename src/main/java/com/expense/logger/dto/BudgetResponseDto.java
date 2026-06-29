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
public class BudgetResponseDto {
    private UUID id;
    private Long categoryId;
    private String categoryName;
    private String categoryColor;
    private BigDecimal monthlyLimit;
    private int warningThresholdPercent;
    private LocalDate startDate;
    private LocalDate endDate;
    
    // Period-specific dynamic calculation fields
    private BigDecimal spent;
    private BigDecimal remaining;
    private BigDecimal utilizationPercentage;
    private boolean exceeded;
    private boolean warningTriggered;
    
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
