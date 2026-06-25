package com.expense.logger.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CategoryPercentageDto {
    private String categoryName;
    private BigDecimal totalAmount;
    private BigDecimal percentage;
    private String color;
}
