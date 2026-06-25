package com.expense.logger.dto;

import lombok.*;
import java.math.BigDecimal;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DateRangeAggregationDto {
    private BigDecimal totalSpent;
    private BigDecimal averageSpentPerDay;
    private List<CategoryPercentageDto> categoryBreakdown;
}
