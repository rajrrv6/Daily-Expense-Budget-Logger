package com.expense.logger.service;

import com.expense.logger.dto.CategoryResponseDto;
import com.expense.logger.dto.ExpenseRequestDto;
import com.expense.logger.dto.ExpenseResponseDto;
import com.expense.logger.exception.ResourceNotFoundException;
import com.expense.logger.model.AuditLog;
import com.expense.logger.model.Category;
import com.expense.logger.model.Expense;
import com.expense.logger.model.User;
import com.expense.logger.repository.AuditLogRepository;
import com.expense.logger.repository.CategoryRepository;
import com.expense.logger.repository.ExpenseRepository;
import com.expense.logger.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.TemporalAdjusters;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;
import com.expense.logger.exception.BadRequestException;
import com.expense.logger.model.Budget;
import com.expense.logger.repository.BudgetRepository;
import lombok.extern.slf4j.Slf4j;

@Service
@Transactional
@Slf4j
public class ExpenseServiceImpl implements ExpenseService {

    private final ExpenseRepository expenseRepository;
    private final CategoryRepository categoryRepository;
    private final UserRepository userRepository;
    private final AuditLogRepository auditLogRepository;
    private final BudgetRepository budgetRepository;
    private final NotificationService notificationService;
    private final ReceiptStorageService receiptStorageService;

    public ExpenseServiceImpl(ExpenseRepository expenseRepository,
                              CategoryRepository categoryRepository,
                              UserRepository userRepository,
                              AuditLogRepository auditLogRepository,
                              BudgetRepository budgetRepository,
                              NotificationService notificationService,
                              ReceiptStorageService receiptStorageService) {
        this.expenseRepository = expenseRepository;
        this.categoryRepository = categoryRepository;
        this.userRepository = userRepository;
        this.auditLogRepository = auditLogRepository;
        this.budgetRepository = budgetRepository;
        this.notificationService = notificationService;
        this.receiptStorageService = receiptStorageService;
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ExpenseResponseDto> getExpenses(UUID userId, LocalDate startDate, LocalDate endDate, Pageable pageable) {
        Page<Expense> expenses;
        if (startDate != null && endDate != null) {
            expenses = expenseRepository.findAllByUserIdAndTransactionDateBetweenAndDeletedAtIsNull(
                    userId, startDate, endDate, pageable);
        } else {
            expenses = expenseRepository.findAllByUserIdAndDeletedAtIsNull(userId, pageable);
        }
        return expenses.map(this::mapToDto);
    }

    @Override
    @Transactional(readOnly = true)
    public ExpenseResponseDto getExpenseById(UUID id, UUID userId) {
        Expense expense = expenseRepository.findByIdAndUserIdAndDeletedAtIsNull(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Expense not found"));
        return mapToDto(expense);
    }

    @Override
    public ExpenseResponseDto createExpense(ExpenseRequestDto dto, UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        Category category = categoryRepository.findById(dto.getCategoryId())
                .orElseThrow(() -> new ResourceNotFoundException("Category not found"));

        Expense expense = Expense.builder()
                .name(dto.getName())
                .amount(dto.getAmount())
                .transactionDate(dto.getTransactionDate())
                .user(user)
                .category(category)
                .receiptPath(dto.getReceiptPath())
                .build();

        expenseRepository.save(expense);

        // Audit Log
        logEvent("EXPENSE_CREATE", "Expense created: name=" + expense.getName() + ", amount=" + expense.getAmount(), user);

        // Trigger budget threshold checks
        triggerBudgetChecks(userId, category);

        return mapToDto(expense);
    }

    @Override
    public ExpenseResponseDto updateExpense(UUID id, ExpenseRequestDto dto, UUID userId) {
        Expense expense = expenseRepository.findByIdAndUserIdAndDeletedAtIsNull(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Expense not found"));

        Category category = categoryRepository.findById(dto.getCategoryId())
                .orElseThrow(() -> new ResourceNotFoundException("Category not found"));

        // Clean up old receipt file if a new one is set, or if receipt was removed
        String oldReceiptPath = expense.getReceiptPath();
        String newReceiptPath = dto.getReceiptPath();
        if (oldReceiptPath != null && !oldReceiptPath.equals(newReceiptPath)) {
            receiptStorageService.deleteFile(oldReceiptPath);
        }

        expense.setName(dto.getName());
        expense.setAmount(dto.getAmount());
        expense.setTransactionDate(dto.getTransactionDate());
        expense.setCategory(category);
        expense.setReceiptPath(newReceiptPath);

        expenseRepository.save(expense);

        // Audit Log
        logEvent("EXPENSE_UPDATE", "Expense updated: name=" + expense.getName() + ", amount=" + expense.getAmount(), expense.getUser());

        // Trigger budget threshold checks
        triggerBudgetChecks(userId, category);

        return mapToDto(expense);
    }

    @Override
    public void deleteExpense(UUID id, UUID userId) {
        Expense expense = expenseRepository.findByIdAndUserIdAndDeletedAtIsNull(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Expense not found"));

        // Soft delete execution
        expense.setDeletedAt(LocalDateTime.now());
        expenseRepository.save(expense);

        // Delete the associated file on disk
        if (expense.getReceiptPath() != null) {
            receiptStorageService.deleteFile(expense.getReceiptPath());
        }

        // Audit Log
        logEvent("EXPENSE_DELETE", "Expense soft-deleted: name=" + expense.getName(), expense.getUser());
    }

    private void logEvent(String actionType, String description, User user) {
        AuditLog auditLog = AuditLog.builder()
                .actionType(actionType)
                .description(description)
                .user(user)
                .build();
        auditLogRepository.save(auditLog);
    }

    private ExpenseResponseDto mapToDto(Expense expense) {
        CategoryResponseDto categoryDto = CategoryResponseDto.builder()
                .id(expense.getCategory().getId())
                .name(expense.getCategory().getName())
                .color(expense.getCategory().getColor())
                .build();

        return ExpenseResponseDto.builder()
                .id(expense.getId())
                .name(expense.getName())
                .amount(expense.getAmount())
                .transactionDate(expense.getTransactionDate())
                .category(categoryDto)
                .createdAt(expense.getCreatedAt())
                .updatedAt(expense.getUpdatedAt())
                .receiptPath(expense.getReceiptPath())
                .build();
    }

    @Override
    public byte[] exportExpensesToPdf(UUID userId, LocalDate startDate, LocalDate endDate, String token) {
        if (startDate != null && endDate != null && startDate.isAfter(endDate)) {
            throw new BadRequestException("Start date must be before or equal to end date");
        }

        List<Expense> expenses;
        if (startDate != null && endDate != null) {
            expenses = expenseRepository.findAllByUserIdAndTransactionDateBetweenAndDeletedAtIsNull(userId, startDate, endDate);
        } else {
            expenses = expenseRepository.findAllByUserIdAndDeletedAtIsNull(userId);
        }

        // Sort chronologically (ascending)
        expenses.sort(Comparator.comparing(Expense::getTransactionDate));

        // Limit to 1000 records to prevent memory spikes in PDF compilation
        if (expenses.size() > 1000) {
            expenses = expenses.subList(0, 1000);
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        try (java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream()) {
            com.lowagie.text.Document document = new com.lowagie.text.Document(com.lowagie.text.PageSize.A4, 36, 36, 36, 36);
            com.lowagie.text.pdf.PdfWriter.getInstance(document, out);
            document.open();

            // Font styles
            com.lowagie.text.Font titleFont = com.lowagie.text.FontFactory.getFont(com.lowagie.text.FontFactory.HELVETICA_BOLD, 22, new java.awt.Color(79, 70, 229));
            com.lowagie.text.Font subtitleFont = com.lowagie.text.FontFactory.getFont(com.lowagie.text.FontFactory.HELVETICA_BOLD, 12, new java.awt.Color(100, 116, 139));
            com.lowagie.text.Font metaLabelFont = com.lowagie.text.FontFactory.getFont(com.lowagie.text.FontFactory.HELVETICA_BOLD, 10, new java.awt.Color(71, 85, 105));
            com.lowagie.text.Font metaValueFont = com.lowagie.text.FontFactory.getFont(com.lowagie.text.FontFactory.HELVETICA, 10, new java.awt.Color(15, 23, 42));
            com.lowagie.text.Font headerFont = com.lowagie.text.FontFactory.getFont(com.lowagie.text.FontFactory.HELVETICA_BOLD, 10, java.awt.Color.WHITE);
            com.lowagie.text.Font bodyFont = com.lowagie.text.FontFactory.getFont(com.lowagie.text.FontFactory.HELVETICA, 9, new java.awt.Color(15, 23, 42));
            com.lowagie.text.Font footerFont = com.lowagie.text.FontFactory.getFont(com.lowagie.text.FontFactory.HELVETICA_OBLIQUE, 8, new java.awt.Color(148, 163, 184));
            com.lowagie.text.Font linkFont = com.lowagie.text.FontFactory.getFont(com.lowagie.text.FontFactory.HELVETICA_BOLD, 9, com.lowagie.text.Font.UNDERLINE, new java.awt.Color(79, 70, 229));
            com.lowagie.text.Font notAvailableFont = com.lowagie.text.FontFactory.getFont(com.lowagie.text.FontFactory.HELVETICA_OBLIQUE, 9, new java.awt.Color(148, 163, 184));

            // Title
            com.lowagie.text.Paragraph title = new com.lowagie.text.Paragraph("Daily Expense & Budget Logger", titleFont);
            title.setSpacingAfter(4);
            document.add(title);

            // Subtitle
            com.lowagie.text.Paragraph subtitle = new com.lowagie.text.Paragraph("Expense Statement Report", subtitleFont);
            subtitle.setSpacingAfter(15);
            document.add(subtitle);

            // Metadata table
            com.lowagie.text.pdf.PdfPTable metaTable = new com.lowagie.text.pdf.PdfPTable(2);
            metaTable.setWidthPercentage(100);
            metaTable.setSpacingAfter(20);
            float[] metaColumnWidths = {1f, 1f};
            metaTable.setWidths(metaColumnWidths);

            String datePeriod = (startDate != null && endDate != null) 
                    ? startDate.toString() + " to " + endDate.toString() 
                    : "All Time";
            
            BigDecimal totalAmount = expenses.stream()
                    .map(Expense::getAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            addMetaCell(metaTable, "Generated For:", user.getFirstName() + " " + user.getLastName() + " (" + user.getEmail() + ")", metaLabelFont, metaValueFont);
            addMetaCell(metaTable, "Statement Period:", datePeriod, metaLabelFont, metaValueFont);
            addMetaCell(metaTable, "Total Transactions:", String.valueOf(expenses.size()), metaLabelFont, metaValueFont);
            addMetaCell(metaTable, "Total Spent:", "₹" + totalAmount.setScale(2, java.math.RoundingMode.HALF_UP).toString(), metaLabelFont, metaValueFont);

            document.add(metaTable);

            // Expense Ledger Table
            com.lowagie.text.pdf.PdfPTable table = new com.lowagie.text.pdf.PdfPTable(5);
            table.setWidthPercentage(100);
            float[] columnWidths = {2.2f, 1.5f, 1.5f, 1.5f, 1.8f};
            table.setWidths(columnWidths);
            table.setSpacingAfter(15);

            // Table Headers
            addHeaderCell(table, "Expense Name", headerFont);
            addHeaderCell(table, "Category", headerFont);
            addHeaderCell(table, "Amount (INR)", headerFont);
            addHeaderCell(table, "Transaction Date", headerFont);
            addHeaderCell(table, "Receipt", headerFont);

            // Table Rows
            boolean alternating = false;
            for (Expense e : expenses) {
                alternating = !alternating;
                java.awt.Color rowBgColor = alternating ? new java.awt.Color(248, 250, 252) : java.awt.Color.WHITE;
                
                addBodyCell(table, e.getName(), bodyFont, rowBgColor, com.lowagie.text.Element.ALIGN_LEFT);
                addBodyCell(table, e.getCategory().getName(), bodyFont, rowBgColor, com.lowagie.text.Element.ALIGN_LEFT);
                addBodyCell(table, "₹" + e.getAmount().setScale(2, java.math.RoundingMode.HALF_UP).toString(), bodyFont, rowBgColor, com.lowagie.text.Element.ALIGN_RIGHT);
                addBodyCell(table, e.getTransactionDate().toString(), bodyFont, rowBgColor, com.lowagie.text.Element.ALIGN_CENTER);

                // Add Receipt link cell
                if (e.getReceiptPath() != null && !e.getReceiptPath().isBlank() && token != null) {
                    String downloadUrl = org.springframework.web.servlet.support.ServletUriComponentsBuilder.fromCurrentContextPath().toUriString() 
                            + "/api/v1/expenses/receipts/" + e.getReceiptPath() + "?token=" + token;
                    
                    com.lowagie.text.Anchor anchor = new com.lowagie.text.Anchor("Download", linkFont);
                    anchor.setReference(downloadUrl);
                    
                    com.lowagie.text.pdf.PdfPCell cell = new com.lowagie.text.pdf.PdfPCell(anchor);
                    cell.setBackgroundColor(rowBgColor);
                    cell.setHorizontalAlignment(com.lowagie.text.Element.ALIGN_CENTER);
                    cell.setPadding(6);
                    cell.setBorderColor(new java.awt.Color(226, 232, 240));
                    table.addCell(cell);
                } else {
                    addBodyCell(table, "Not Available", notAvailableFont, rowBgColor, com.lowagie.text.Element.ALIGN_CENTER);
                }
            }

            document.add(table);

            // Footer / Timestamp
            com.lowagie.text.Paragraph footer = new com.lowagie.text.Paragraph("Report generated automatically on: " + java.time.LocalDateTime.now().toString(), footerFont);
            footer.setAlignment(com.lowagie.text.Element.ALIGN_CENTER);
            document.add(footer);

            document.close();
            
            logEvent("EXPENSE_EXPORT", "Exported " + expenses.size() + " expenses to PDF", user);
            
            return out.toByteArray();
        } catch (com.lowagie.text.DocumentException | java.io.IOException ex) {
            log.error("Failed to generate PDF report for user {}", userId, ex);
            throw new RuntimeException("Could not generate PDF expense report", ex);
        }
    }

    private void addMetaCell(com.lowagie.text.pdf.PdfPTable table, String label, String value, com.lowagie.text.Font labelFont, com.lowagie.text.Font valueFont) {
        com.lowagie.text.Phrase phrase = new com.lowagie.text.Phrase();
        phrase.add(new com.lowagie.text.Chunk(label + " ", labelFont));
        phrase.add(new com.lowagie.text.Chunk(value, valueFont));
        
        com.lowagie.text.pdf.PdfPCell cell = new com.lowagie.text.pdf.PdfPCell(phrase);
        cell.setBorder(com.lowagie.text.pdf.PdfPCell.NO_BORDER);
        cell.setPadding(4);
        table.addCell(cell);
    }

    private void addHeaderCell(com.lowagie.text.pdf.PdfPTable table, String text, com.lowagie.text.Font font) {
        com.lowagie.text.pdf.PdfPCell cell = new com.lowagie.text.pdf.PdfPCell(new com.lowagie.text.Phrase(text, font));
        cell.setBackgroundColor(new java.awt.Color(15, 23, 42)); // Slate-900
        cell.setHorizontalAlignment(com.lowagie.text.Element.ALIGN_CENTER);
        cell.setPadding(8);
        cell.setBorderColor(new java.awt.Color(51, 65, 85)); // Slate-700
        table.addCell(cell);
    }

    private void addBodyCell(com.lowagie.text.pdf.PdfPTable table, String text, com.lowagie.text.Font font, java.awt.Color bgColor, int align) {
        com.lowagie.text.pdf.PdfPCell cell = new com.lowagie.text.pdf.PdfPCell(new com.lowagie.text.Phrase(text, font));
        cell.setBackgroundColor(bgColor);
        cell.setHorizontalAlignment(align);
        cell.setPadding(6);
        cell.setBorderColor(new java.awt.Color(226, 232, 240)); // Slate-200
        table.addCell(cell);
    }

    private void triggerBudgetChecks(UUID userId, Category category) {
        try {
            LocalDate now = LocalDate.now();
            LocalDate start = now.with(TemporalAdjusters.firstDayOfMonth());
            LocalDate end = now.with(TemporalAdjusters.lastDayOfMonth());
            
            // Get all expenses of the user in this month
            List<Expense> monthExpenses = expenseRepository.findAllByUserIdAndTransactionDateBetweenAndDeletedAtIsNull(userId, start, end);
            
            BigDecimal totalSpent = monthExpenses.stream()
                    .map(Expense::getAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
                    
            List<Budget> activeBudgets = budgetRepository.findAllByUserIdAndDeletedAtIsNull(userId);
            
            // Check global budget
            Budget globalBudget = activeBudgets.stream()
                    .filter(b -> b.getCategory() == null)
                    .findFirst()
                    .orElse(null);
            if (globalBudget != null) {
                notificationService.checkBudgetThresholds(
                        userId, null, totalSpent, globalBudget.getMonthlyLimit(), globalBudget.getWarningThresholdPercent()
                );
            }
            
            // Check category budget
            if (category != null) {
                final Long categoryId = category.getId();
                Budget categoryBudget = activeBudgets.stream()
                        .filter(b -> b.getCategory() != null && b.getCategory().getId().equals(categoryId))
                        .findFirst()
                        .orElse(null);
                if (categoryBudget != null) {
                    BigDecimal categorySpent = monthExpenses.stream()
                            .filter(e -> e.getCategory() != null && e.getCategory().getId().equals(categoryId))
                            .map(Expense::getAmount)
                            .reduce(BigDecimal.ZERO, BigDecimal::add);
                    notificationService.checkBudgetThresholds(
                            userId, categoryId, categorySpent, categoryBudget.getMonthlyLimit(), categoryBudget.getWarningThresholdPercent()
                    );
                }
            }
        } catch (Exception e) {
            log.error("Failed to execute budget notification threshold check", e);
        }
    }
}
