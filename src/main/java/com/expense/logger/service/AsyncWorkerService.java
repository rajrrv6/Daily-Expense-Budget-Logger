package com.expense.logger.service;

import com.expense.logger.model.AuditLog;
import com.expense.logger.model.Category;
import com.expense.logger.model.Expense;
import com.expense.logger.model.User;
import com.expense.logger.repository.AuditLogRepository;
import com.expense.logger.repository.CategoryRepository;
import com.expense.logger.repository.ExpenseRepository;
import com.expense.logger.repository.UserRepository;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import java.util.concurrent.Executor;

@Service
@Slf4j
public class AsyncWorkerService {

    private final AsyncTaskQueueService queueService;
    private final EmailService emailService;
    private final NotificationCenterService notificationCenterService;
    private final AuditLogRepository auditLogRepository;
    private final UserRepository userRepository;
    private final ExpenseRepository expenseRepository;
    private final CategoryRepository categoryRepository;
    private final ExpenseServiceImpl expenseService; 
    private final Executor taskExecutor;

    public AsyncWorkerService(AsyncTaskQueueService queueService,
                              EmailService emailService,
                              NotificationCenterService notificationCenterService,
                              AuditLogRepository auditLogRepository,
                              UserRepository userRepository,
                              ExpenseRepository expenseRepository,
                              CategoryRepository categoryRepository,
                              @Lazy ExpenseServiceImpl expenseService,
                              @Qualifier("taskExecutor") Executor taskExecutor) {
        this.queueService = queueService;
        this.emailService = emailService;
        this.notificationCenterService = notificationCenterService;
        this.auditLogRepository = auditLogRepository;
        this.userRepository = userRepository;
        this.expenseRepository = expenseRepository;
        this.categoryRepository = categoryRepository;
        this.expenseService = expenseService;
        this.taskExecutor = taskExecutor;
    }

    @PostConstruct
    public void init() {
        // Start the worker loop in a background executor thread
        taskExecutor.execute(this::runWorkerLoop);
    }

    public void runWorkerLoop() {
        log.info("Starting background async worker thread loop...");
        while (!Thread.currentThread().isInterrupted()) {
            try {
                AsyncJob job = queueService.takeJob();
                processJob(job);
            } catch (InterruptedException e) {
                log.info("Background worker thread loop interrupted. Shutting down.");
                Thread.currentThread().interrupt();
                break;
            } catch (Exception e) {
                log.error("Exception occurred in worker queue processor: ", e);
            }
        }
    }

    private void processJob(AsyncJob job) {
        log.info("Worker processing job {} of type {}.", job.getJobId(), job.getJobType());
        try {
            switch (job.getJobType()) {
                case EMAIL_SENDING:
                    handleEmailSending(job);
                    break;
                case AUDIT_LOGGING:
                    handleAuditLogging(job);
                    break;
                case NOTIFICATION_GENERATION:
                    handleNotificationGeneration(job);
                    break;
                case BULK_UPLOAD_PROCESSING:
                    handleBulkUploadProcessing(job);
                    break;
                case ANALYTICS_RECALCULATION:
                    handleAnalyticsRecalculation(job);
                    break;
            }
            log.info("Successfully completed job {}.", job.getJobId());
        } catch (Exception e) {
            log.error("Failed to process job {} of type {}: ", job.getJobId(), job.getJobType(), e);
        }
    }

    private void handleEmailSending(AsyncJob job) {
        String to = (String) job.getPayload().get("to");
        String subject = (String) job.getPayload().get("subject");
        String body = (String) job.getPayload().get("body");
        emailService.sendEmail(to, subject, body);
    }

    private void handleAuditLogging(AsyncJob job) {
        String userIdStr = (String) job.getPayload().get("userId");
        String actionType = (String) job.getPayload().get("actionType");
        String description = (String) job.getPayload().get("description");

        User user = null;
        if (userIdStr != null) {
            user = userRepository.findById(UUID.fromString(userIdStr)).orElse(null);
        }

        AuditLog auditLog = AuditLog.builder()
                .actionType(actionType)
                .description(description)
                .user(user)
                .build();
        auditLogRepository.save(auditLog);
    }

    private void handleNotificationGeneration(AsyncJob job) {
        String userIdStr = (String) job.getPayload().get("userId");
        String title = (String) job.getPayload().get("title");
        String message = (String) job.getPayload().get("message");
        String severity = (String) job.getPayload().get("severity");
        String category = (String) job.getPayload().get("category");

        User user = userRepository.findById(UUID.fromString(userIdStr))
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userIdStr));

        notificationCenterService.triggerNotification(user, title, message, severity, category);
    }

    @SuppressWarnings("unchecked")
    private void handleBulkUploadProcessing(AsyncJob job) {
        String userIdStr = (String) job.getPayload().get("userId");
        List<String[]> rawRows = (List<String[]>) job.getPayload().get("rawRows");
        String duplicateAction = (String) job.getPayload().get("duplicateAction");

        UUID userId = UUID.fromString(userIdStr);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userIdStr));

        int nameIdx = (Integer) job.getPayload().get("nameIdx");
        int categoryIdx = (Integer) job.getPayload().get("categoryIdx");
        int amountIdx = (Integer) job.getPayload().get("amountIdx");
        int dateIdx = (Integer) job.getPayload().get("dateIdx");
        int receiptIdx = (Integer) job.getPayload().get("receiptIdx");

        log.info("Processing bulk upload for user {} in chunks of 100 rows. Total rows to process: {}", user.getUsername(), rawRows.size());

        List<Category> allCategories = categoryRepository.findAllByDeletedAtIsNull();
        Map<String, Category> categoryCache = new HashMap<>();
        for (Category c : allCategories) {
            categoryCache.put(c.getName().toLowerCase(), c);
        }

        List<Expense> chunkList = new ArrayList<>();
        Set<Category> updatedCategories = new HashSet<>();
        int successCount = 0;
        int failedCount = 0;
        int duplicateCount = 0;

        for (int r = 0; r < rawRows.size(); r++) {
            String[] row = rawRows.get(r);
            int rowNum = r + 2; 

            try {
                String rawName = row[nameIdx];
                String rawCategory = row[categoryIdx];
                String rawAmount = row[amountIdx];
                String rawDate = row[dateIdx];
                String rawReceipt = receiptIdx != -1 ? row[receiptIdx] : "";

                if (rawName.isEmpty() || rawCategory.isEmpty() || rawAmount.isEmpty() || rawDate.isEmpty()) {
                    failedCount++;
                    continue;
                }

                BigDecimal amount = new BigDecimal(rawAmount);
                if (amount.compareTo(BigDecimal.ZERO) <= 0) {
                    failedCount++;
                    continue;
                }

                LocalDate transDate;
                if (rawDate.matches("^\\d+$")) {
                    long days = Long.parseLong(rawDate);
                    transDate = LocalDate.of(1899, 12, 30).plusDays(days);
                } else {
                    transDate = LocalDate.parse(rawDate);
                }

                // Resolve Category 
                String catKey = rawCategory.toLowerCase();
                Category categoryEntity = categoryCache.get(catKey);
                if (categoryEntity == null) {
                    categoryEntity = Category.builder()
                            .name(rawCategory)
                            .color(expenseService.generateRandomColor())
                            .build();
                    categoryEntity = categoryRepository.save(categoryEntity);
                    categoryCache.put(catKey, categoryEntity);
                }

                // Check duplicate check fields: name, amount, transactionDate
                boolean isDuplicate = expenseRepository.existsByNameAndAmountAndTransactionDateAndUserIdAndDeletedAtIsNull(
                        rawName, amount, transDate, userId
                );

                if (isDuplicate) {
                    duplicateCount++;
                    if ("skip".equalsIgnoreCase(duplicateAction)) {
                        continue;
                    }
                }

                Expense expense = Expense.builder()
                        .name(rawName)
                        .amount(amount)
                        .transactionDate(transDate)
                        .user(user)
                        .category(categoryEntity)
                        .receiptPath(rawReceipt.isEmpty() ? null : rawReceipt)
                        .build();

                chunkList.add(expense);
                updatedCategories.add(categoryEntity);

                // Chunk-based batch insert every 100 records
                if (chunkList.size() >= 100) {
                    expenseRepository.saveAll(chunkList);
                    successCount += chunkList.size();
                    chunkList.clear();
                }

            } catch (Exception e) {
                failedCount++;
                log.warn("Failed to process row {} during bulk upload: {}", rowNum, e.getMessage());
            }
        }

        // Save remaining records in final chunk
        if (!chunkList.isEmpty()) {
            expenseRepository.saveAll(chunkList);
            successCount += chunkList.size();
            chunkList.clear();
        }

        log.info("Bulk upload completed for user {}. Success: {}, Failed: {}, Duplicates: {}", 
                user.getUsername(), successCount, failedCount, duplicateCount);

        // Trigger budget notification limits checks
        for (Category cat : updatedCategories) {
            try {
                expenseService.triggerBudgetChecks(userId, cat);
            } catch (Exception e) {
                log.error("Failed to trigger budget checks for user {} and category {}", userId, cat.getName(), e);
            }
        }

        // Log completion audit event
        AuditLog auditLog = AuditLog.builder()
                .actionType("BULK_UPLOAD_COMPLETED")
                .description("Background bulk upload processed: " + successCount + " successful, " + failedCount + " failed")
                .user(user)
                .build();
        auditLogRepository.save(auditLog);
    }

    private void handleAnalyticsRecalculation(AsyncJob job) {
        log.info("Analytics recalculation triggered.");
    }
}
