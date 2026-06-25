package com.expense.logger.service;

import java.math.BigDecimal;
import java.util.UUID;

public interface NotificationService {
    void checkBudgetThresholds(UUID userId, Long categoryId, BigDecimal currentMonthSpent, BigDecimal limit, int thresholdPercent);
    void sendSimulatedEmail(String toEmail, String subject, String body);
}
