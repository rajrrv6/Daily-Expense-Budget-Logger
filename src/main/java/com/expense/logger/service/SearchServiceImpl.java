package com.expense.logger.service;

import com.expense.logger.dto.*;
import com.expense.logger.model.*;
import com.expense.logger.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class SearchServiceImpl implements SearchService {

    private final ExpenseRepository expenseRepository;
    private final CategoryRepository categoryRepository;
    private final BudgetRepository budgetRepository;
    private final TodoItemRepository todoItemRepository;

    public SearchServiceImpl(ExpenseRepository expenseRepository,
                             CategoryRepository categoryRepository,
                             BudgetRepository budgetRepository,
                             TodoItemRepository todoItemRepository) {
        this.expenseRepository = expenseRepository;
        this.categoryRepository = categoryRepository;
        this.budgetRepository = budgetRepository;
        this.todoItemRepository = todoItemRepository;
    }

    @Override
    public GlobalSearchResultDto globalSearch(UUID userId, String query) {
        if (query == null || query.trim().length() < 2) {
            return GlobalSearchResultDto.builder()
                    .expenses(List.of())
                    .categories(List.of())
                    .budgets(List.of())
                    .checklists(List.of())
                    .build();
        }

        String sanitizedQuery = query.trim();

        List<ExpenseResponseDto> expenses = expenseRepository.searchExpenses(userId, sanitizedQuery).stream()
                .map(this::mapExpenseToDto)
                .collect(Collectors.toList());

        List<CategoryResponseDto> categories = categoryRepository.searchCategories(sanitizedQuery).stream()
                .map(this::mapCategoryToDto)
                .collect(Collectors.toList());

        List<BudgetResponseDto> budgets = budgetRepository.searchBudgets(userId, sanitizedQuery).stream()
                .map(this::mapBudgetToDto)
                .collect(Collectors.toList());

        List<TodoResponseDto> checklists = todoItemRepository.searchTodoItems(userId, sanitizedQuery).stream()
                .map(this::mapTodoToDto)
                .collect(Collectors.toList());

        return GlobalSearchResultDto.builder()
                .expenses(expenses)
                .categories(categories)
                .budgets(budgets)
                .checklists(checklists)
                .build();
    }

    private ExpenseResponseDto mapExpenseToDto(Expense expense) {
        return ExpenseResponseDto.builder()
                .id(expense.getId())
                .name(expense.getName())
                .amount(expense.getAmount())
                .transactionDate(expense.getTransactionDate())
                .category(mapCategoryToDto(expense.getCategory()))
                .receiptPath(expense.getReceiptPath())
                .createdAt(expense.getCreatedAt())
                .updatedAt(expense.getUpdatedAt())
                .build();
    }

    private CategoryResponseDto mapCategoryToDto(Category category) {
        if (category == null) return null;
        return CategoryResponseDto.builder()
                .id(category.getId())
                .name(category.getName())
                .color(category.getColor())
                .createdAt(category.getCreatedAt())
                .build();
    }

    private BudgetResponseDto mapBudgetToDto(Budget budget) {
        return BudgetResponseDto.builder()
                .id(budget.getId())
                .categoryId(budget.getCategory() != null ? budget.getCategory().getId() : null)
                .categoryName(budget.getCategory() != null ? budget.getCategory().getName() : "Global")
                .categoryColor(budget.getCategory() != null ? budget.getCategory().getColor() : "#64748B")
                .monthlyLimit(budget.getMonthlyLimit())
                .warningThresholdPercent(budget.getWarningThresholdPercent())
                .startDate(budget.getStartDate())
                .endDate(budget.getEndDate())
                .createdAt(budget.getCreatedAt())
                .updatedAt(budget.getUpdatedAt())
                .build();
    }

    private TodoResponseDto mapTodoToDto(TodoItem item) {
        return TodoResponseDto.builder()
                .id(item.getId())
                .name(item.getName())
                .completed(item.isCompleted())
                .price(item.getPrice())
                .categoryId(item.getCategory() != null ? item.getCategory().getId() : null)
                .categoryName(item.getCategory() != null ? item.getCategory().getName() : null)
                .categoryColor(item.getCategory() != null ? item.getCategory().getColor() : null)
                .targetDate(item.getTargetDate())
                .createdAt(item.getCreatedAt())
                .updatedAt(item.getUpdatedAt())
                .build();
    }
}
