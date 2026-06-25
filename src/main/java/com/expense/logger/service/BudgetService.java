package com.expense.logger.service;

import com.expense.logger.dto.BudgetRequestDto;
import com.expense.logger.dto.BudgetResponseDto;

import java.util.List;
import java.util.UUID;

public interface BudgetService {
    BudgetResponseDto createBudget(BudgetRequestDto requestDto, UUID userId);
    List<BudgetResponseDto> getBudgets(UUID userId);
    BudgetResponseDto updateBudget(UUID id, BudgetRequestDto requestDto, UUID userId);
    void deleteBudget(UUID id, UUID userId);
}
