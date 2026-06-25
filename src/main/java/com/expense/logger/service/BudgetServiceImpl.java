package com.expense.logger.service;

import com.expense.logger.dto.BudgetRequestDto;
import com.expense.logger.dto.BudgetResponseDto;
import com.expense.logger.exception.BadRequestException;
import com.expense.logger.exception.ResourceNotFoundException;
import com.expense.logger.model.AuditLog;
import com.expense.logger.model.Budget;
import com.expense.logger.model.Category;
import com.expense.logger.model.User;
import com.expense.logger.repository.AuditLogRepository;
import com.expense.logger.repository.BudgetRepository;
import com.expense.logger.repository.CategoryRepository;
import com.expense.logger.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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

    public BudgetServiceImpl(BudgetRepository budgetRepository,
                             UserRepository userRepository,
                             CategoryRepository categoryRepository,
                             AuditLogRepository auditLogRepository) {
        this.budgetRepository = budgetRepository;
        this.userRepository = userRepository;
        this.categoryRepository = categoryRepository;
        this.auditLogRepository = auditLogRepository;
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

        return mapToDto(budget);
    }

    @Override
    @Transactional(readOnly = true)
    public List<BudgetResponseDto> getBudgets(UUID userId) {
        List<Budget> budgets = budgetRepository.findAllByUserIdAndDeletedAtIsNull(userId);
        return budgets.stream()
                .map(this::mapToDto)
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

        return mapToDto(budget);
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

    private BudgetResponseDto mapToDto(Budget budget) {
        return BudgetResponseDto.builder()
                .id(budget.getId())
                .categoryId(budget.getCategory() != null ? budget.getCategory().getId() : null)
                .categoryName(budget.getCategory() != null ? budget.getCategory().getName() : "Global")
                .categoryColor(budget.getCategory() != null ? budget.getCategory().getColor() : null)
                .monthlyLimit(budget.getMonthlyLimit())
                .warningThresholdPercent(budget.getWarningThresholdPercent())
                .startDate(budget.getStartDate())
                .endDate(budget.getEndDate())
                .createdAt(budget.getCreatedAt())
                .updatedAt(budget.getUpdatedAt())
                .build();
    }
}
