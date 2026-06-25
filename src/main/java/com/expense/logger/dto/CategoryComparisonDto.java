package com.expense.logger.dto;

import lombok.*;
import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CategoryComparisonDto {
    private String categoryName;
    private String color;
    private BigDecimal currentMonthAmount;
    private BigDecimal previousMonthAmount;
    private BigDecimal differenceAmount; // currentMonthAmount - previousMonthAmount
    private BigDecimal percentageChange; // ((current - previous) / previous) * 100
}
