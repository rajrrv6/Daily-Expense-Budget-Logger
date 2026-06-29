package com.expense.logger.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BudgetRequestDto {

    private Long categoryId;

    @NotNull(message = "Monthly limit is required.")
    @DecimalMin(value = "0.01", message = "Monthly limit must be greater than 0.")
    private BigDecimal monthlyLimit;

    @NotNull(message = "Warning threshold is required.")
    @Min(value = 1, message = "Warning threshold must be between 1 and 100.")
    @Max(value = 100, message = "Warning threshold must be between 1 and 100.")
    private Integer warningThresholdPercent;

    @NotNull(message = "Start date is required.")
    private LocalDate startDate;

    @NotNull(message = "End date is required.")
    private LocalDate endDate;
}
