package com.expense.logger.controller;

import com.expense.logger.dto.BudgetRequestDto;
import com.expense.logger.dto.BudgetResponseDto;
import com.expense.logger.exception.ResourceNotFoundException;
import com.expense.logger.model.User;
import com.expense.logger.repository.UserRepository;
import com.expense.logger.service.BudgetService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/budgets")
public class BudgetController {

    private final BudgetService budgetService;
    private final UserRepository userRepository;

    public BudgetController(BudgetService budgetService, UserRepository userRepository) {
        this.budgetService = budgetService;
        this.userRepository = userRepository;
    }

    @GetMapping
    public ResponseEntity<List<BudgetResponseDto>> getBudgets(Authentication authentication) {
        UUID userId = getAuthenticatedUserId(authentication);
        return ResponseEntity.ok(budgetService.getBudgets(userId));
    }

    @PostMapping
    public ResponseEntity<BudgetResponseDto> createBudget(
            Authentication authentication,
            @Valid @RequestBody BudgetRequestDto dto) {
        UUID userId = getAuthenticatedUserId(authentication);
        BudgetResponseDto response = budgetService.createBudget(dto, userId);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<BudgetResponseDto> updateBudget(
            Authentication authentication,
            @PathVariable UUID id,
            @Valid @RequestBody BudgetRequestDto dto) {
        UUID userId = getAuthenticatedUserId(authentication);
        return ResponseEntity.ok(budgetService.updateBudget(id, dto, userId));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteBudget(
            Authentication authentication,
            @PathVariable UUID id) {
        UUID userId = getAuthenticatedUserId(authentication);
        budgetService.deleteBudget(id, userId);
        return ResponseEntity.noContent().build();
    }

    private UUID getAuthenticatedUserId(Authentication authentication) {
        User user = userRepository.findByUsernameAndDeletedAtIsNull(authentication.getName())
                .or(() -> userRepository.findByEmailAndDeletedAtIsNull(authentication.getName()))
                .orElseThrow(() -> new ResourceNotFoundException("User context not found"));
        return user.getId();
    }
}
