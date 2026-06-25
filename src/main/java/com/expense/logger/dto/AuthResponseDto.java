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
public class AuthResponseDto {
    private String accessToken;
    private String refreshToken;
    private String username;
    private String email;
    private String firstName;
    private String lastName;
    private String phoneNumber;
    private BigDecimal monthlyIncome;
}
