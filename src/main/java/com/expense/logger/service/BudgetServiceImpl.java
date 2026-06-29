package com.expense.logger.service;

import com.expense.logger.dto.BudgetRequestDto;
import com.expense.logger.dto.BudgetResponseDto;
import com.expense.logger.exception.BadRequestException;
import com.expense.logger.exception.ResourceNotFoundException;
import com.expense.logger.model.AuditLog;
import com.expense.logger.model.Budget;
import com.expense.logger.model.Category;
import com.expense.logger.model.User;
import com.expense.logger.model.Expense;
import com.expense.logger.repository.AuditLogRepository;
import com.expense.logger.repository.BudgetRepository;
import com.expense.logger.repository.CategoryRepository;
import com.expense.logger.repository.UserRepository;
import com.expense.logger.repository.ExpenseRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Transactional
public class BudgetServiceImpl implements BudgetService {

    private final BudgetRepository budgetRepository;
    private final UserRepository userRepository;
    private final CategoryRepository categoryRepository;
    private final AuditLogRepository auditLogRepository;
    private final ExpenseRepository expenseRepository;

    public BudgetServiceImpl(BudgetRepository budgetRepository,
                             UserRepository userRepository,
                             CategoryRepository categoryRepository,
                             AuditLogRepository auditLogRepository,
                             ExpenseRepository expenseRepository) {
        this.budgetRepository = budgetRepository;
        this.userRepository = userRepository;
        this.categoryRepository = categoryRepository;
        this.auditLogRepository = auditLogRepository;
        this.expenseRepository = expenseRepository;
    }

    @Override
    public BudgetResponseDto createBudget(BudgetRequestDto requestDto, UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (requestDto.getStartDate().isAfter(requestDto.getEndDate())) {
            throw new BadRequestException("Start date cannot be after end date");
        }

        Category category = null;
        if (requestDto.getCategoryId() != null) {
            category = categoryRepository.findById(requestDto.getCategoryId())
                    .orElseThrow(() -> new ResourceNotFoundException("Category not found"));
        }

        Budget budget = Budget.builder()
                .user(user)
                .category(category)
                .monthlyLimit(requestDto.getMonthlyLimit())
                .warningThresholdPercent(requestDto.getWarningThresholdPercent())
                .startDate(requestDto.getStartDate())
                .endDate(requestDto.getEndDate())
                .build();

        budgetRepository.save(budget);

        logEvent("BUDGET_CREATE", "Budget created: limit=" + budget.getMonthlyLimit() + ", category=" + 
                (category != null ? category.getName() : "Global"), user);

        List<Expense> expenses = expenseRepository.findAllByUserIdAndDeletedAtIsNull(userId);
        return mapToDto(budget, expenses);
    }

    @Override
    @Transactional(readOnly = true)
    public List<BudgetResponseDto> getBudgets(UUID userId) {
        List<Budget> budgets = budgetRepository.findAllByUserIdAndDeletedAtIsNull(userId);
        List<Expense> expenses = expenseRepository.findAllByUserIdAndDeletedAtIsNull(userId);
        return budgets.stream()
                .map(b -> mapToDto(b, expenses))
                .collect(Collectors.toList());
    }

    @Override
    public BudgetResponseDto updateBudget(UUID id, BudgetRequestDto requestDto, UUID userId) {
        Budget budget = budgetRepository.findByIdAndUserIdAndDeletedAtIsNull(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Budget not found or access denied"));

        if (requestDto.getStartDate().isAfter(requestDto.getEndDate())) {
            throw new BadRequestException("Start date cannot be after end date");
        }

        Category category = null;
        if (requestDto.getCategoryId() != null) {
            category = categoryRepository.findById(requestDto.getCategoryId())
                    .orElseThrow(() -> new ResourceNotFoundException("Category not found"));
        }

        budget.setCategory(category);
        budget.setMonthlyLimit(requestDto.getMonthlyLimit());
        budget.setWarningThresholdPercent(requestDto.getWarningThresholdPercent());
        budget.setStartDate(requestDto.getStartDate());
        budget.setEndDate(requestDto.getEndDate());

        budgetRepository.save(budget);

        logEvent("BUDGET_UPDATE", "Budget updated: id=" + budget.getId() + ", limit=" + budget.getMonthlyLimit(), budget.getUser());

        List<Expense> expenses = expenseRepository.findAllByUserIdAndDeletedAtIsNull(userId);
        return mapToDto(budget, expenses);
    }

    @Override
    public void deleteBudget(UUID id, UUID userId) {
        Budget budget = budgetRepository.findByIdAndUserIdAndDeletedAtIsNull(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Budget not found or access denied"));

        budget.setDeletedAt(LocalDateTime.now());
        budgetRepository.save(budget);

        logEvent("BUDGET_DELETE", "Budget deleted: id=" + budget.getId(), budget.getUser());
    }

    private void logEvent(String actionType, String description, User user) {
        AuditLog auditLog = AuditLog.builder()
                .actionType(actionType)
                .description(description)
                .user(user)
                .build();
        auditLogRepository.save(auditLog);
    }

    private BudgetResponseDto mapToDto(Budget budget, List<Expense> userExpenses) {
        BigDecimal spent = BigDecimal.ZERO;
        LocalDate start = budget.getStartDate();
        LocalDate end = budget.getEndDate();
        
        if (budget.getCategory() == null) {
            // Global budget: sum all user expenses within budget validity date range
            spent = userExpenses.stream()
                    .filter(e -> !e.getTransactionDate().isBefore(start) && !e.getTransactionDate().isAfter(end))
                    .map(Expense::getAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
        } else {
            // Category-specific budget: filter by category and date range
            final Long categoryId = budget.getCategory().getId();
            spent = userExpenses.stream()
                    .filter(e -> !e.getTransactionDate().isBefore(start) && !e.getTransactionDate().isAfter(end))
                    .filter(e -> e.getCategory() != null && e.getCategory().getId().equals(categoryId))
                    .map(Expense::getAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
        }

        BigDecimal remaining = budget.getMonthlyLimit().subtract(spent);
        
        BigDecimal util = BigDecimal.ZERO;
        if (budget.getMonthlyLimit().compareTo(BigDecimal.ZERO) > 0) {
            util = spent.multiply(new BigDecimal("100")).divide(budget.getMonthlyLimit(), 2, java.math.RoundingMode.HALF_UP);
        }

        boolean exceeded = spent.compareTo(budget.getMonthlyLimit()) > 0;
        BigDecimal thresholdAmount = budget.getMonthlyLimit()
                .multiply(new BigDecimal(budget.getWarningThresholdPercent()))
                .divide(new BigDecimal("100"), 2, java.math.RoundingMode.HALF_UP);
        boolean warningTriggered = spent.compareTo(thresholdAmount) >= 0;

        return BudgetResponseDto.builder()
                .id(budget.getId())
                .categoryId(budget.getCategory() != null ? budget.getCategory().getId() : null)
                .categoryName(budget.getCategory() != null ? budget.getCategory().getName() : "Global")
                .categoryColor(budget.getCategory() != null ? budget.getCategory().getColor() : null)
                .monthlyLimit(budget.getMonthlyLimit())
                .warningThresholdPercent(budget.getWarningThresholdPercent())
                .startDate(budget.getStartDate())
                .endDate(budget.getEndDate())
                .spent(spent)
                .remaining(remaining)
                .utilizationPercentage(util)
                .exceeded(exceeded)
                .warningTriggered(warningTriggered)
                .createdAt(budget.getCreatedAt())
                .updatedAt(budget.getUpdatedAt())
                .build();
    }
}
