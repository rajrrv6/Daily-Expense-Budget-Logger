package com.expense.logger.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ResetPasswordRequestDto {

    @NotBlank(message = "Reset token is required.")
    private String token;

    @NotBlank(message = "New password cannot be blank.")
    @Size(min = 6, max = 255, message = "Password must be at least 6 characters.")
    private String newPassword;
}
