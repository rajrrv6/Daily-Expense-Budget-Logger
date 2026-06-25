package com.expense.logger.service;

import com.expense.logger.dto.CategoryResponseDto;
import com.expense.logger.dto.ExpenseRequestDto;
import com.expense.logger.dto.ExpenseResponseDto;
import com.expense.logger.exception.ResourceNotFoundException;
import com.expense.logger.model.AuditLog;
import com.expense.logger.model.Category;
import com.expense.logger.model.Expense;
import com.expense.logger.model.User;
import com.expense.logger.repository.AuditLogRepository;
import com.expense.logger.repository.CategoryRepository;
import com.expense.logger.repository.ExpenseRepository;
import com.expense.logger.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.TemporalAdjusters;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import com.expense.logger.exception.BadRequestException;
import com.expense.logger.model.Budget;
import com.expense.logger.repository.BudgetRepository;
import lombok.extern.slf4j.Slf4j;

@Service
@Transactional
@Slf4j
public class ExpenseServiceImpl implements ExpenseService {

    private final ExpenseRepository expenseRepository;
    private final CategoryRepository categoryRepository;
    private final UserRepository userRepository;
    private final AuditLogRepository auditLogRepository;
    private final BudgetRepository budgetRepository;
    private final NotificationService notificationService;

    public ExpenseServiceImpl(ExpenseRepository expenseRepository,
                              CategoryRepository categoryRepository,
                              UserRepository userRepository,
                              AuditLogRepository auditLogRepository,
                              BudgetRepository budgetRepository,
                              NotificationService notificationService) {
        this.expenseRepository = expenseRepository;
        this.categoryRepository = categoryRepository;
        this.userRepository = userRepository;
        this.auditLogRepository = auditLogRepository;
        this.budgetRepository = budgetRepository;
        this.notificationService = notificationService;
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ExpenseResponseDto> getExpenses(UUID userId, LocalDate startDate, LocalDate endDate, Pageable pageable) {
        Page<Expense> expenses;
        if (startDate != null && endDate != null) {
            expenses = expenseRepository.findAllByUserIdAndTransactionDateBetweenAndDeletedAtIsNull(
                    userId, startDate, endDate, pageable);
        } else {
            expenses = expenseRepository.findAllByUserIdAndDeletedAtIsNull(userId, pageable);
        }
        return expenses.map(this::mapToDto);
    }

    @Override
    @Transactional(readOnly = true)
    public ExpenseResponseDto getExpenseById(UUID id, UUID userId) {
        Expense expense = expenseRepository.findByIdAndUserIdAndDeletedAtIsNull(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Expense not found"));
        return mapToDto(expense);
    }

    @Override
    public ExpenseResponseDto createExpense(ExpenseRequestDto dto, UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        Category category = categoryRepository.findById(dto.getCategoryId())
                .orElseThrow(() -> new ResourceNotFoundException("Category not found"));

        Expense expense = Expense.builder()
                .name(dto.getName())
                .amount(dto.getAmount())
                .transactionDate(dto.getTransactionDate())
                .user(user)
                .category(category)
                .build();

        expenseRepository.save(expense);

        // Audit Log
        logEvent("EXPENSE_CREATE", "Expense created: name=" + expense.getName() + ", amount=" + expense.getAmount(), user);

        // Trigger budget threshold checks
        triggerBudgetChecks(userId, category);

        return mapToDto(expense);
    }

    @Override
    public ExpenseResponseDto updateExpense(UUID id, ExpenseRequestDto dto, UUID userId) {
        Expense expense = expenseRepository.findByIdAndUserIdAndDeletedAtIsNull(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Expense not found"));

        Category category = categoryRepository.findById(dto.getCategoryId())
                .orElseThrow(() -> new ResourceNotFoundException("Category not found"));

        expense.setName(dto.getName());
        expense.setAmount(dto.getAmount());
        expense.setTransactionDate(dto.getTransactionDate());
        expense.setCategory(category);

        expenseRepository.save(expense);

        // Audit Log
        logEvent("EXPENSE_UPDATE", "Expense updated: name=" + expense.getName() + ", amount=" + expense.getAmount(), expense.getUser());

        // Trigger budget threshold checks
        triggerBudgetChecks(userId, category);

        return mapToDto(expense);
    }

    @Override
    public void deleteExpense(UUID id, UUID userId) {
        Expense expense = expenseRepository.findByIdAndUserIdAndDeletedAtIsNull(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Expense not found"));

        // Soft delete execution
        expense.setDeletedAt(LocalDateTime.now());
        expenseRepository.save(expense);

        // Audit Log
        logEvent("EXPENSE_DELETE", "Expense soft-deleted: name=" + expense.getName(), expense.getUser());
    }

    private void logEvent(String actionType, String description, User user) {
        AuditLog auditLog = AuditLog.builder()
                .actionType(actionType)
                .description(description)
                .user(user)
                .build();
        auditLogRepository.save(auditLog);
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

    @Override
    public byte[] exportExpensesToCsv(UUID userId, LocalDate startDate, LocalDate endDate) {
        if (startDate != null && endDate != null && startDate.isAfter(endDate)) {
            throw new BadRequestException("Start date must be before or equal to end date");
        }

        List<Expense> expenses;
        if (startDate != null && endDate != null) {
            expenses = expenseRepository.findAllByUserIdAndTransactionDateBetweenAndDeletedAtIsNull(userId, startDate, endDate);
        } else {
            expenses = expenseRepository.findAllByUserIdAndDeletedAtIsNull(userId);
        }

        // Sort chronologically (ascending)
        expenses.sort(Comparator.comparing(Expense::getTransactionDate));

        // Limit to 1000 records to prevent memory spikes
        if (expenses.size() > 1000) {
            expenses = expenses.subList(0, 1000);
        }

        StringBuilder csv = new StringBuilder();
        // UTF-8 BOM
        csv.append("\uFEFF");
        csv.append("Expense ID,Name,Amount,Category,Transaction Date,Created At\n");

        for (Expense e : expenses) {
            csv.append(sanitizeCsvValue(e.getId().toString())).append(",")
               .append(sanitizeCsvValue(e.getName())).append(",")
               .append(sanitizeCsvValue(e.getAmount().toPlainString())).append(",")
               .append(sanitizeCsvValue(e.getCategory().getName())).append(",")
               .append(sanitizeCsvValue(e.getTransactionDate().toString())).append(",")
               .append(sanitizeCsvValue(e.getCreatedAt().toString())).append("\n");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        logEvent("EXPENSE_EXPORT", "Exported " + expenses.size() + " expenses to CSV", user);

        return csv.toString().getBytes(StandardCharsets.UTF_8);
    }

    private String sanitizeCsvValue(String value) {
        if (value == null) {
            return "";
        }
        String result = value;
        // Prefix dangerous formulas (=, +, -, @) with a single quote to prevent CSV injection
        if (result.startsWith("=") || result.startsWith("+") || result.startsWith("-") || result.startsWith("@")) {
            result = "'" + result;
        }
        // Escape quotes and wrap value in quotes if it contains commas, quotes, or newlines
        if (result.contains("\"") || result.contains(",") || result.contains("\n") || result.contains("\r")) {
            result = result.replace("\"", "\"\"");
            result = "\"" + result + "\"";
        }
        return result;
    }

    private void triggerBudgetChecks(UUID userId, Category category) {
        try {
            LocalDate now = LocalDate.now();
            LocalDate start = now.with(TemporalAdjusters.firstDayOfMonth());
            LocalDate end = now.with(TemporalAdjusters.lastDayOfMonth());
            
            // Get all expenses of the user in this month
            List<Expense> monthExpenses = expenseRepository.findAllByUserIdAndTransactionDateBetweenAndDeletedAtIsNull(userId, start, end);
            
            BigDecimal totalSpent = monthExpenses.stream()
                    .map(Expense::getAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
                    
            List<Budget> activeBudgets = budgetRepository.findAllByUserIdAndDeletedAtIsNull(userId);
            
            // Check global budget
            Budget globalBudget = activeBudgets.stream()
                    .filter(b -> b.getCategory() == null)
                    .findFirst()
                    .orElse(null);
            if (globalBudget != null) {
                notificationService.checkBudgetThresholds(
                        userId, null, totalSpent, globalBudget.getMonthlyLimit(), globalBudget.getWarningThresholdPercent()
                );
            }
            
            // Check category budget
            if (category != null) {
                final Long categoryId = category.getId();
                Budget categoryBudget = activeBudgets.stream()
                        .filter(b -> b.getCategory() != null && b.getCategory().getId().equals(categoryId))
                        .findFirst()
                        .orElse(null);
                if (categoryBudget != null) {
                    BigDecimal categorySpent = monthExpenses.stream()
                            .filter(e -> e.getCategory() != null && e.getCategory().getId().equals(categoryId))
                            .map(Expense::getAmount)
                            .reduce(BigDecimal.ZERO, BigDecimal::add);
                    notificationService.checkBudgetThresholds(
                            userId, categoryId, categorySpent, categoryBudget.getMonthlyLimit(), categoryBudget.getWarningThresholdPercent()
                    );
                }
            }
        } catch (Exception e) {
            log.error("Failed to execute budget notification threshold check", e);
        }
    }
}
