package com.expense.logger.service;

import com.expense.logger.dto.ExpenseRequestDto;
import com.expense.logger.dto.ExpenseResponseDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;
import java.util.UUID;

public interface ExpenseService {
    Page<ExpenseResponseDto> getExpenses(UUID userId, LocalDate startDate, LocalDate endDate, Pageable pageable);
    ExpenseResponseDto getExpenseById(UUID id, UUID userId);
    ExpenseResponseDto createExpense(ExpenseRequestDto dto, UUID userId);
    ExpenseResponseDto updateExpense(UUID id, ExpenseRequestDto dto, UUID userId);
    void deleteExpense(UUID id, UUID userId);
    byte[] exportExpensesToPdf(UUID userId, LocalDate startDate, LocalDate endDate, String token);
    com.expense.logger.dto.BulkUploadResponseDto bulkUpload(UUID userId, org.springframework.web.multipart.MultipartFile file, boolean preview, String duplicateAction);
}
