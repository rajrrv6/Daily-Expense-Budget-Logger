package com.expense.logger.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GlobalSearchResultDto {
    private List<ExpenseResponseDto> expenses;
    private List<CategoryResponseDto> categories;
    private List<BudgetResponseDto> budgets;
    private List<TodoResponseDto> checklists;
}
