package com.expense.logger.dto;

import lombok.*;
import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MonthlyTrendDto {
    private String month; // Format: YYYY-MM
    private BigDecimal totalAmount;
    private BigDecimal budgetLimit;
}
