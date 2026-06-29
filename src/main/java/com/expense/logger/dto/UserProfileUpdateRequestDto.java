package com.expense.logger.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.DecimalMin;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserProfileUpdateRequestDto {

    @NotBlank(message = "Username cannot be blank.")
    @Size(min = 3, max = 50, message = "Username must be between 3 and 50 characters.")
    @jakarta.validation.constraints.Pattern(regexp = "^[a-zA-Z0-9_]+$", message = "Username can only contain letters, numbers, and underscores (no spaces).")
    private String username;

    @NotBlank(message = "Email cannot be blank.")
    @Email(message = "Invalid email format.")
    @Size(max = 100, message = "Email must be less than 100 characters.")
    private String email;

    @NotBlank(message = "First name cannot be blank.")
    @Size(min = 1, max = 50, message = "First name must be between 1 and 50 characters.")
    private String firstName;

    @NotBlank(message = "Last name cannot be blank.")
    @Size(min = 1, max = 50, message = "Last name must be between 1 and 50 characters.")
    private String lastName;

    @NotBlank(message = "Phone number cannot be blank.")
    @jakarta.validation.constraints.Pattern(
        regexp = "^\\+?[0-9]{10,15}$",
        message = "Phone number must be a valid mobile number with 10 to 15 digits (optional '+' prefix)."
    )
    private String phoneNumber;

    @NotNull(message = "Monthly income is required.")
    @DecimalMin(value = "0.00", message = "Monthly income must be greater than or equal to zero.")
    private BigDecimal monthlyIncome;
}
