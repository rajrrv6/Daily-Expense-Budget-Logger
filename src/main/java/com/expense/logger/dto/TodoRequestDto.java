package com.expense.logger.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TodoRequestDto {

    @NotBlank(message = "Todo item name is required")
    @Size(max = 100, message = "Todo item name must not exceed 100 characters")
    private String name;

    private BigDecimal price;
    private Long categoryId;
    private LocalDate targetDate;
}
