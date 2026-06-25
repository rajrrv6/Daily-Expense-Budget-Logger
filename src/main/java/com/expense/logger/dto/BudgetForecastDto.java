package com.expense.logger.dto;

import lombok.*;
import java.math.BigDecimal;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BudgetForecastDto {
    private BigDecimal forecastedAmount;
    private String confidenceLevel; // HIGH, MEDIUM, LOW
    private String basis; // e.g. "Calculated from last 3 months average"
    private List<String> recommendations;
    private BigDecimal projectedRemainingBudget;
    private boolean isProjectedOverBudget;
}
