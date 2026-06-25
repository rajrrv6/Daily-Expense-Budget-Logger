package com.expense.logger.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DashboardSummaryDto {
    private BigDecimal totalExpensesMonth;
    private BigDecimal budgetLimit;
    private BigDecimal budgetUtilizationPercent;
    private String highestSpendingCategory;
    private List<CategoryPercentageDto> categoryBreakdown;
    private BigDecimal remainingBudget;
    private List<BudgetSummaryDto> budgets;
}
