package com.expense.logger.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BudgetSummaryDto {
    private String categoryName;
    private Long categoryId;
    private String categoryColor;
    private BigDecimal limitAmount;
    private BigDecimal spentAmount;
    private BigDecimal remainingAmount;
    private BigDecimal utilizationPercent;
    private int warningThresholdPercent;
    private boolean exceeded;
    private boolean warningTriggered;
}
