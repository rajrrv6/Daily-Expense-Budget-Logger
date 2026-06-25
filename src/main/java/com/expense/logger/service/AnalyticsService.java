package com.expense.logger.service;

import com.expense.logger.dto.DashboardSummaryDto;
import com.expense.logger.dto.ExpenseResponseDto;
import com.expense.logger.dto.MonthlyTrendDto;
import com.expense.logger.dto.CategoryComparisonDto;
import com.expense.logger.dto.DateRangeAggregationDto;
import com.expense.logger.dto.BudgetForecastDto;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface AnalyticsService {
    DashboardSummaryDto getDashboardSummary(UUID userId);
    List<ExpenseResponseDto> getRecentExpenses(UUID userId, int limit);
    List<MonthlyTrendDto> getMonthlyTrends(UUID userId);
    List<CategoryComparisonDto> getCategoryComparison(UUID userId);
    DateRangeAggregationDto getRangeAggregation(UUID userId, LocalDate startDate, LocalDate endDate);
    BudgetForecastDto getBudgetForecast(UUID userId);
}
