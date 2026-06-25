package com.expense.logger.controller;

import com.expense.logger.dto.ExpenseRequestDto;
import com.expense.logger.service.ReceiptStorageService;
import org.springframework.core.io.Resource;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.nio.file.Files;
import java.util.Map;
import java.util.HashMap;
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
import jakarta.servlet.http.HttpServletRequest;

import java.time.LocalDate;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/expenses")
public class ExpenseController {

    private final ExpenseService expenseService;
    private final UserRepository userRepository;
    private final ReceiptStorageService receiptStorageService;

    public ExpenseController(ExpenseService expenseService, UserRepository userRepository, ReceiptStorageService receiptStorageService) {
        this.expenseService = expenseService;
        this.userRepository = userRepository;
        this.receiptStorageService = receiptStorageService;
    }

    @GetMapping("/export")
    public ResponseEntity<byte[]> exportExpenses(
            Authentication authentication,
            HttpServletRequest request,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        
        UUID userId = getAuthenticatedUserId(authentication);
        
        String token = request.getHeader("Authorization");
        if (token != null && token.startsWith("Bearer ")) {
            token = token.substring(7);
        }

        byte[] pdfData = expenseService.exportExpensesToPdf(userId, startDate, endDate, token);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDisposition(ContentDisposition.attachment().filename("expenses_export.pdf").build());

        return new ResponseEntity<>(pdfData, headers, HttpStatus.OK);
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

    @PostMapping("/receipts")
    public ResponseEntity<Map<String, String>> uploadReceipt(
            Authentication authentication,
            @RequestParam("file") MultipartFile file) {
        getAuthenticatedUserId(authentication);
        String storedFileName = receiptStorageService.storeFile(file);
        Map<String, String> response = new HashMap<>();
        response.put("fileName", storedFileName);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/receipts/{filename:.+}")
    public ResponseEntity<Resource> downloadReceipt(
            Authentication authentication,
            @PathVariable String filename) {
        getAuthenticatedUserId(authentication);
        Resource fileResource = receiptStorageService.loadFileAsResource(filename);
        String contentType = null;
        try {
            contentType = Files.probeContentType(fileResource.getFile().toPath());
        } catch (IOException ex) {
            contentType = "application/octet-stream";
        }
        if (contentType == null) {
            contentType = "application/octet-stream";
        }
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + fileResource.getFilename() + "\"")
                .body(fileResource);
    }

    private UUID getAuthenticatedUserId(Authentication authentication) {
        User user = userRepository.findByUsernameAndDeletedAtIsNull(authentication.getName())
                .or(() -> userRepository.findByEmailAndDeletedAtIsNull(authentication.getName()))
                .orElseThrow(() -> new ResourceNotFoundException("User context not found"));
        return user.getId();
    }
}
