package com.expense.logger.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TodoRequestDto {

    @NotBlank(message = "Todo item name is required")
    @Size(max = 100, message = "Todo item name must not exceed 100 characters")
    private String name;
}
