package com.expense.logger.service;

import com.expense.logger.dto.*;
import com.expense.logger.exception.BadRequestException;
import com.expense.logger.exception.ResourceNotFoundException;
import com.expense.logger.model.Category;
import com.expense.logger.model.Expense;
import com.expense.logger.model.Budget;
import com.expense.logger.repository.CategoryRepository;
import com.expense.logger.repository.ExpenseRepository;
import com.expense.logger.repository.BudgetRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.time.temporal.TemporalAdjusters;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class AnalyticsServiceImpl implements AnalyticsService {

    private final ExpenseRepository expenseRepository;
    private final CategoryRepository categoryRepository;
    private final BudgetRepository budgetRepository;

    public AnalyticsServiceImpl(ExpenseRepository expenseRepository, 
                                CategoryRepository categoryRepository,
                                BudgetRepository budgetRepository) {
        this.expenseRepository = expenseRepository;
        this.categoryRepository = categoryRepository;
        this.budgetRepository = budgetRepository;
    }

    @Override
    public DashboardSummaryDto getDashboardSummary(UUID userId) {
        LocalDate now = LocalDate.now();
        LocalDate startOfMonth = now.with(TemporalAdjusters.firstDayOfMonth());
        LocalDate endOfMonth = now.with(TemporalAdjusters.lastDayOfMonth());

        // Fetch all user expenses for the current month
        PageRequest allPageable = PageRequest.of(0, Integer.MAX_VALUE);
        List<Expense> monthExpenses = expenseRepository
                .findAllByUserIdAndTransactionDateBetweenAndDeletedAtIsNull(userId, startOfMonth, endOfMonth, allPageable)
                .getContent();

        // 1. Calculate Monthly Total
        BigDecimal totalExpenses = monthExpenses.stream()
                .map(Expense::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Fetch user active budgets
        List<Budget> activeBudgets = budgetRepository.findAllByUserIdAndDeletedAtIsNull(userId);

        // 2. Budget Limit Calculation
        BigDecimal budgetLimit = BigDecimal.ZERO;
        Budget globalBudget = activeBudgets.stream()
                .filter(b -> b.getCategory() == null)
                .findFirst()
                .orElse(null);

        if (globalBudget != null) {
            budgetLimit = globalBudget.getMonthlyLimit();
        } else {
            budgetLimit = activeBudgets.stream()
                    .map(Budget::getMonthlyLimit)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
        }

        // 3. Budget Utilization
        BigDecimal utilizationPercent = BigDecimal.ZERO;
        if (totalExpenses.compareTo(BigDecimal.ZERO) > 0 && budgetLimit.compareTo(BigDecimal.ZERO) > 0) {
            utilizationPercent = totalExpenses
                    .multiply(new BigDecimal("100"))
                    .divide(budgetLimit, 2, RoundingMode.HALF_UP);
        }

        BigDecimal remainingBudget = budgetLimit.subtract(totalExpenses);

        // 4. Category Breakdown Aggregation
        Map<CategorySummaryKey, BigDecimal> categoryTotals = monthExpenses.stream()
                .collect(Collectors.groupingBy(
                        e -> new CategorySummaryKey(e.getCategory().getName(), e.getCategory().getColor()),
                        Collectors.reducing(BigDecimal.ZERO, Expense::getAmount, BigDecimal::add)
                ));

        List<CategoryPercentageDto> breakdown = categoryTotals.entrySet().stream()
                .map(entry -> {
                    BigDecimal catTotal = entry.getValue();
                    BigDecimal percent = BigDecimal.ZERO;
                    if (totalExpenses.compareTo(BigDecimal.ZERO) > 0) {
                        percent = catTotal
                                .multiply(new BigDecimal("100"))
                                .divide(totalExpenses, 2, RoundingMode.HALF_UP);
                    }
                    return CategoryPercentageDto.builder()
                            .categoryName(entry.getKey().name)
                            .totalAmount(catTotal)
                            .percentage(percent)
                            .color(entry.getKey().color)
                            .build();
                })
                .sorted((a, b) -> b.getTotalAmount().compareTo(a.getTotalAmount()))
                .collect(Collectors.toList());

        // 5. Highest spending category
        String highestSpendingCategory = "N/A";
        if (!breakdown.isEmpty()) {
            highestSpendingCategory = breakdown.get(0).getCategoryName();
        }

        // 6. Build Budget Details List
        List<BudgetSummaryDto> budgetSummaries = new java.util.ArrayList<>();
        for (Budget budget : activeBudgets) {
            BigDecimal spent = BigDecimal.ZERO;
            if (budget.getCategory() == null) {
                spent = totalExpenses;
            } else {
                final Long categoryId = budget.getCategory().getId();
                spent = monthExpenses.stream()
                        .filter(e -> e.getCategory() != null && e.getCategory().getId().equals(categoryId))
                        .map(Expense::getAmount)
                        .reduce(BigDecimal.ZERO, BigDecimal::add);
            }

            BigDecimal remaining = budget.getMonthlyLimit().subtract(spent);
            BigDecimal util = BigDecimal.ZERO;
            if (budget.getMonthlyLimit().compareTo(BigDecimal.ZERO) > 0) {
                util = spent.multiply(new BigDecimal("100")).divide(budget.getMonthlyLimit(), 2, RoundingMode.HALF_UP);
            }

            boolean exceeded = spent.compareTo(budget.getMonthlyLimit()) > 0;
            BigDecimal thresholdAmount = budget.getMonthlyLimit()
                    .multiply(new BigDecimal(budget.getWarningThresholdPercent()))
                    .divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
            boolean warningTriggered = spent.compareTo(thresholdAmount) >= 0;

            budgetSummaries.add(BudgetSummaryDto.builder()
                    .categoryName(budget.getCategory() != null ? budget.getCategory().getName() : "Global")
                    .categoryId(budget.getCategory() != null ? budget.getCategory().getId() : null)
                    .categoryColor(budget.getCategory() != null ? budget.getCategory().getColor() : null)
                    .limitAmount(budget.getMonthlyLimit())
                    .spentAmount(spent)
                    .remainingAmount(remaining)
                    .utilizationPercent(util)
                    .warningThresholdPercent(budget.getWarningThresholdPercent())
                    .exceeded(exceeded)
                    .warningTriggered(warningTriggered)
                    .build());
        }

        return DashboardSummaryDto.builder()
                .totalExpensesMonth(totalExpenses)
                .budgetLimit(budgetLimit)
                .budgetUtilizationPercent(utilizationPercent)
                .highestSpendingCategory(highestSpendingCategory)
                .categoryBreakdown(breakdown)
                .remainingBudget(remainingBudget)
                .budgets(budgetSummaries)
                .build();
    }

    @Override
    public List<ExpenseResponseDto> getRecentExpenses(UUID userId, int limit) {
        Sort sort = Sort.by(Sort.Order.desc("transactionDate"), Sort.Order.desc("createdAt"));
        PageRequest pageRequest = PageRequest.of(0, limit, sort);

        return expenseRepository.findAllByUserIdAndDeletedAtIsNull(userId, pageRequest)
                .getContent()
                .stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Override
    public List<MonthlyTrendDto> getMonthlyTrends(UUID userId) {
        List<Expense> expenses = expenseRepository.findAllByUserIdAndDeletedAtIsNull(userId);

        Map<String, BigDecimal> monthlyTotals = expenses.stream()
                .collect(Collectors.groupingBy(
                        e -> e.getTransactionDate().getYear() + "-" + String.format("%02d", e.getTransactionDate().getMonthValue()),
                        Collectors.reducing(BigDecimal.ZERO, Expense::getAmount, BigDecimal::add)
                ));

        return monthlyTotals.entrySet().stream()
                .map(entry -> new MonthlyTrendDto(entry.getKey(), entry.getValue()))
                .sorted(Comparator.comparing(MonthlyTrendDto::getMonth))
                .collect(Collectors.toList());
    }

    @Override
    public List<CategoryComparisonDto> getCategoryComparison(UUID userId) {
        LocalDate now = LocalDate.now();
        LocalDate startOfCurrent = now.with(TemporalAdjusters.firstDayOfMonth());
        LocalDate endOfCurrent = now.with(TemporalAdjusters.lastDayOfMonth());
        LocalDate startOfPrevious = now.minusMonths(1).with(TemporalAdjusters.firstDayOfMonth());
        LocalDate endOfPrevious = now.minusMonths(1).with(TemporalAdjusters.lastDayOfMonth());

        List<Expense> currentExpenses = expenseRepository
                .findAllByUserIdAndTransactionDateBetweenAndDeletedAtIsNull(userId, startOfCurrent, endOfCurrent);
        List<Expense> previousExpenses = expenseRepository
                .findAllByUserIdAndTransactionDateBetweenAndDeletedAtIsNull(userId, startOfPrevious, endOfPrevious);
        List<Category> allCategories = categoryRepository.findAllByDeletedAtIsNull();

        List<CategoryComparisonDto> comparisons = new ArrayList<>();

        for (Category category : allCategories) {
            BigDecimal currentSum = currentExpenses.stream()
                    .filter(e -> e.getCategory().getId().equals(category.getId()))
                    .map(Expense::getAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            BigDecimal previousSum = previousExpenses.stream()
                    .filter(e -> e.getCategory().getId().equals(category.getId()))
                    .map(Expense::getAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            // Only report comparison if there was spending in at least one of the months
            if (currentSum.compareTo(BigDecimal.ZERO) > 0 || previousSum.compareTo(BigDecimal.ZERO) > 0) {
                BigDecimal difference = currentSum.subtract(previousSum);
                BigDecimal percentageChange = BigDecimal.ZERO;

                if (previousSum.compareTo(BigDecimal.ZERO) > 0) {
                    percentageChange = difference.multiply(new BigDecimal("100"))
                            .divide(previousSum, 2, RoundingMode.HALF_UP);
                } else if (currentSum.compareTo(BigDecimal.ZERO) > 0) {
                    // Increased from 0 to positive spending
                    percentageChange = new BigDecimal("100.00");
                }

                comparisons.add(CategoryComparisonDto.builder()
                        .categoryName(category.getName())
                        .color(category.getColor())
                        .currentMonthAmount(currentSum)
                        .previousMonthAmount(previousSum)
                        .differenceAmount(difference)
                        .percentageChange(percentageChange)
                        .build());
            }
        }

        // Sort descending by current month's spending
        comparisons.sort((a, b) -> b.getCurrentMonthAmount().compareTo(a.getCurrentMonthAmount()));
        return comparisons;
    }

    @Override
    public DateRangeAggregationDto getRangeAggregation(UUID userId, LocalDate startDate, LocalDate endDate) {
        if (startDate == null || endDate == null) {
            throw new BadRequestException("Start date and End date are required parameters.");
        }
        if (startDate.isAfter(endDate)) {
            throw new BadRequestException("Start date must be before or equal to End date.");
        }
        if (ChronoUnit.DAYS.between(startDate, endDate) > 366) {
            throw new BadRequestException("Aggregation window cannot exceed 1 year (366 days).");
        }

        List<Expense> expenses = expenseRepository
                .findAllByUserIdAndTransactionDateBetweenAndDeletedAtIsNull(userId, startDate, endDate);

        BigDecimal totalSpent = expenses.stream()
                .map(Expense::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        long daysInRange = ChronoUnit.DAYS.between(startDate, endDate) + 1;
        BigDecimal averageSpentPerDay = BigDecimal.ZERO;
        if (daysInRange > 0) {
            averageSpentPerDay = totalSpent.divide(BigDecimal.valueOf(daysInRange), 2, RoundingMode.HALF_UP);
        }

        // Category breakdown within range
        Map<CategorySummaryKey, BigDecimal> categoryTotals = expenses.stream()
                .collect(Collectors.groupingBy(
                        e -> new CategorySummaryKey(e.getCategory().getName(), e.getCategory().getColor()),
                        Collectors.reducing(BigDecimal.ZERO, Expense::getAmount, BigDecimal::add)
                ));

        BigDecimal finalTotalSpent = totalSpent;
        List<CategoryPercentageDto> breakdown = categoryTotals.entrySet().stream()
                .map(entry -> {
                    BigDecimal catTotal = entry.getValue();
                    BigDecimal percent = BigDecimal.ZERO;
                    if (finalTotalSpent.compareTo(BigDecimal.ZERO) > 0) {
                        percent = catTotal.multiply(new BigDecimal("100"))
                                .divide(finalTotalSpent, 2, RoundingMode.HALF_UP);
                    }
                    return CategoryPercentageDto.builder()
                            .categoryName(entry.getKey().name)
                            .totalAmount(catTotal)
                            .percentage(percent)
                            .color(entry.getKey().color)
                            .build();
                })
                .sorted((a, b) -> b.getTotalAmount().compareTo(a.getTotalAmount()))
                .collect(Collectors.toList());

        return DateRangeAggregationDto.builder()
                .totalSpent(totalSpent)
                .averageSpentPerDay(averageSpentPerDay)
                .categoryBreakdown(breakdown)
                .build();
    }

    @Override
    public BudgetForecastDto getBudgetForecast(UUID userId) {
        LocalDate now = LocalDate.now();
        
        // Target 3 completed calendar months
        LocalDate m1Start = now.minusMonths(1).with(TemporalAdjusters.firstDayOfMonth());
        LocalDate m1End = now.minusMonths(1).with(TemporalAdjusters.lastDayOfMonth());
        
        LocalDate m2Start = now.minusMonths(2).with(TemporalAdjusters.firstDayOfMonth());
        LocalDate m2End = now.minusMonths(2).with(TemporalAdjusters.lastDayOfMonth());

        LocalDate m3Start = now.minusMonths(3).with(TemporalAdjusters.firstDayOfMonth());
        LocalDate m3End = now.minusMonths(3).with(TemporalAdjusters.lastDayOfMonth());

        List<Expense> m1Expenses = expenseRepository.findAllByUserIdAndTransactionDateBetweenAndDeletedAtIsNull(userId, m1Start, m1End);
        List<Expense> m2Expenses = expenseRepository.findAllByUserIdAndTransactionDateBetweenAndDeletedAtIsNull(userId, m2Start, m2End);
        List<Expense> m3Expenses = expenseRepository.findAllByUserIdAndTransactionDateBetweenAndDeletedAtIsNull(userId, m3Start, m3End);

        BigDecimal sum1 = m1Expenses.stream().map(Expense::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal sum2 = m2Expenses.stream().map(Expense::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal sum3 = m3Expenses.stream().map(Expense::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);

        int activeMonthsCount = 0;
        BigDecimal totalHistoricalSum = BigDecimal.ZERO;
        
        if (sum1.compareTo(BigDecimal.ZERO) > 0 || !m1Expenses.isEmpty()) {
            activeMonthsCount++;
            totalHistoricalSum = totalHistoricalSum.add(sum1);
        }
        if (sum2.compareTo(BigDecimal.ZERO) > 0 || !m2Expenses.isEmpty()) {
            activeMonthsCount++;
            totalHistoricalSum = totalHistoricalSum.add(sum2);
        }
        if (sum3.compareTo(BigDecimal.ZERO) > 0 || !m3Expenses.isEmpty()) {
            activeMonthsCount++;
            totalHistoricalSum = totalHistoricalSum.add(sum3);
        }

        BigDecimal forecastedAmount = BigDecimal.ZERO;
        String confidenceLevel = "LOW";
        String basis = "No historical completed months found.";

        if (activeMonthsCount > 0) {
            forecastedAmount = totalHistoricalSum.divide(BigDecimal.valueOf(activeMonthsCount), 2, RoundingMode.HALF_UP);
            if (activeMonthsCount == 3) {
                confidenceLevel = "HIGH";
                basis = "Calculated using 3-month completed calendar historical moving average.";
            } else {
                confidenceLevel = "MEDIUM";
                basis = "Calculated using " + activeMonthsCount + "-month historical completed average.";
            }
        } else {
            // Fallback: use current month's spending as forecast projection if no complete months exist
            LocalDate curStart = now.with(TemporalAdjusters.firstDayOfMonth());
            LocalDate curEnd = now.with(TemporalAdjusters.lastDayOfMonth());
            List<Expense> curExpenses = expenseRepository.findAllByUserIdAndTransactionDateBetweenAndDeletedAtIsNull(userId, curStart, curEnd);
            BigDecimal curSum = curExpenses.stream().map(Expense::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
            if (curSum.compareTo(BigDecimal.ZERO) > 0) {
                forecastedAmount = curSum;
                basis = "No historical completed months. Relying on current month's active spending.";
            }
        }

        List<Budget> activeBudgets = budgetRepository.findAllByUserIdAndDeletedAtIsNull(userId);
        BigDecimal budgetLimit = BigDecimal.ZERO;
        Budget globalBudget = activeBudgets.stream()
                .filter(b -> b.getCategory() == null)
                .findFirst()
                .orElse(null);

        if (globalBudget != null) {
            budgetLimit = globalBudget.getMonthlyLimit();
        } else {
            budgetLimit = activeBudgets.stream()
                    .map(Budget::getMonthlyLimit)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
        }

        boolean isBudgetConfigured = budgetLimit.compareTo(BigDecimal.ZERO) > 0;
        BigDecimal projectedRemaining = isBudgetConfigured ? budgetLimit.subtract(forecastedAmount) : BigDecimal.ZERO;
        boolean isProjectedOver = isBudgetConfigured && forecastedAmount.compareTo(budgetLimit) > 0;

        List<String> recommendations = new ArrayList<>();
        if (!isBudgetConfigured) {
            recommendations.add("You don't have a monthly budget set up. We recommend setting up a budget limit in the Budgets page to track your financial goals effectively.");
        } else if (isProjectedOver) {
            recommendations.add("Your projected next month spending of ₹" + forecastedAmount.setScale(2, RoundingMode.HALF_UP) + 
                    " exceeds your budget cap of ₹" + budgetLimit.setScale(2, RoundingMode.HALF_UP) + ". We suggest reviewing non-essential expenses.");
        } else if (forecastedAmount.compareTo(BigDecimal.ZERO) > 0) {
            recommendations.add("Your next month spending projection is within your budget cap. Continue tracking to maintain this trend.");
        } else {
            recommendations.add("No expense data available to formulate spending forecasts. Please log your transactions to see forecast analysis.");
        }

        // Add specific category-level recommendations if a user spends a lot on a category historically
        List<Expense> historicalExpenses = expenseRepository.findAllByUserIdAndDeletedAtIsNull(userId);
        if (!historicalExpenses.isEmpty()) {
            Map<String, BigDecimal> categorySpend = historicalExpenses.stream()
                    .collect(Collectors.groupingBy(e -> e.getCategory().getName(), 
                            Collectors.reducing(BigDecimal.ZERO, Expense::getAmount, BigDecimal::add)));
            
            BigDecimal grandTotal = historicalExpenses.stream().map(Expense::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
            if (grandTotal.compareTo(BigDecimal.ZERO) > 0) {
                for (Map.Entry<String, BigDecimal> entry : categorySpend.entrySet()) {
                    BigDecimal percentageOfTotal = entry.getValue().multiply(new BigDecimal("100")).divide(grandTotal, 2, RoundingMode.HALF_UP);
                    if (percentageOfTotal.compareTo(new BigDecimal("40.00")) > 0) {
                        recommendations.add("Category '" + entry.getKey() + "' accounts for " + percentageOfTotal.setScale(1, RoundingMode.HALF_UP) + 
                                "% of your lifetime transactions. Budgeting here will yield maximum savings.");
                    }
                }
            }
        }

        return BudgetForecastDto.builder()
                .forecastedAmount(forecastedAmount)
                .confidenceLevel(confidenceLevel)
                .basis(basis)
                .recommendations(recommendations)
                .projectedRemainingBudget(projectedRemaining)
                .isProjectedOverBudget(isProjectedOver)
                .build();
    }

    private ExpenseResponseDto mapToDto(Expense expense) {
        CategoryResponseDto categoryDto = CategoryResponseDto.builder()
                .id(expense.getCategory().getId())
                .name(expense.getCategory().getName())
                .color(expense.getCategory().getColor())
                .build();

        return ExpenseResponseDto.builder()
                .id(expense.getId())
                .name(expense.getName())
                .amount(expense.getAmount())
                .transactionDate(expense.getTransactionDate())
                .category(categoryDto)
                .createdAt(expense.getCreatedAt())
                .updatedAt(expense.getUpdatedAt())
                .build();
    }

    private static record CategorySummaryKey(String name, String color) {}
}
