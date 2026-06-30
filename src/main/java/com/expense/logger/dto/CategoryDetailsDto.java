package com.expense.logger.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CategoryDetailsDto {
    private Long id;
    private String name;
    private String color;
    private LocalDateTime createdAt;
    private BigDecimal budgetLimit;
    private Long expenseCount;
    private List<ExpenseResponseDto> recentExpenses;
}
