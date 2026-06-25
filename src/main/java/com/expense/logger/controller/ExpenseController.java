package com.expense.logger.controller;

import com.expense.logger.dto.ExpenseRequestDto;
import com.expense.logger.dto.ExpenseResponseDto;
import com.expense.logger.dto.PagedResponseDto;
import com.expense.logger.exception.ResourceNotFoundException;
import com.expense.logger.model.User;
import com.expense.logger.repository.UserRepository;
import com.expense.logger.service.ExpenseService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/expenses")
public class ExpenseController {

    private final ExpenseService expenseService;
    private final UserRepository userRepository;

    public ExpenseController(ExpenseService expenseService, UserRepository userRepository) {
        this.expenseService = expenseService;
        this.userRepository = userRepository;
    }

    @GetMapping("/export")
    public ResponseEntity<byte[]> exportExpenses(
            Authentication authentication,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        
        UUID userId = getAuthenticatedUserId(authentication);
        byte[] csvData = expenseService.exportExpensesToCsv(userId, startDate, endDate);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType("text/csv; charset=UTF-8"));
        headers.setContentDisposition(ContentDisposition.attachment().filename("expenses_export.csv").build());

        return new ResponseEntity<>(csvData, headers, HttpStatus.OK);
    }

    @GetMapping
    public ResponseEntity<PagedResponseDto<ExpenseResponseDto>> getExpenses(
            Authentication authentication,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(defaultValue = "0") int pageNumber,
            @RequestParam(defaultValue = "10") int pageSize,
            @RequestParam(defaultValue = "transactionDate") String sortBy,
            @RequestParam(defaultValue = "DESC") String sortDirection) {

        UUID userId = getAuthenticatedUserId(authentication);
        
        Sort sort = Sort.by(Sort.Direction.fromString(sortDirection), sortBy);
        Pageable pageable = PageRequest.of(pageNumber, pageSize, sort);

        Page<ExpenseResponseDto> result = expenseService.getExpenses(userId, startDate, endDate, pageable);

        PagedResponseDto<ExpenseResponseDto> pagedResponse = PagedResponseDto.<ExpenseResponseDto>builder()
                .content(result.getContent())
                .pageNumber(result.getNumber())
                .pageSize(result.getSize())
                .totalElements(result.getTotalElements())
                .totalPages(result.getTotalPages())
                .isLast(result.isLast())
                .build();

        return ResponseEntity.ok(pagedResponse);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ExpenseResponseDto> getExpenseById(Authentication authentication, @PathVariable UUID id) {
        UUID userId = getAuthenticatedUserId(authentication);
        return ResponseEntity.ok(expenseService.getExpenseById(id, userId));
    }

    @PostMapping
    public ResponseEntity<ExpenseResponseDto> createExpense(
            Authentication authentication,
            @Valid @RequestBody ExpenseRequestDto expenseRequestDto) {
        UUID userId = getAuthenticatedUserId(authentication);
        return ResponseEntity.ok(expenseService.createExpense(expenseRequestDto, userId));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ExpenseResponseDto> updateExpense(
            Authentication authentication,
            @PathVariable UUID id,
            @Valid @RequestBody ExpenseRequestDto expenseRequestDto) {
        UUID userId = getAuthenticatedUserId(authentication);
        return ResponseEntity.ok(expenseService.updateExpense(id, expenseRequestDto, userId));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteExpense(Authentication authentication, @PathVariable UUID id) {
        UUID userId = getAuthenticatedUserId(authentication);
        expenseService.deleteExpense(id, userId);
        return ResponseEntity.noContent().build();
    }

    private UUID getAuthenticatedUserId(Authentication authentication) {
        User user = userRepository.findByUsernameAndDeletedAtIsNull(authentication.getName())
                .or(() -> userRepository.findByEmailAndDeletedAtIsNull(authentication.getName()))
                .orElseThrow(() -> new ResourceNotFoundException("User context not found"));
        return user.getId();
    }
}
