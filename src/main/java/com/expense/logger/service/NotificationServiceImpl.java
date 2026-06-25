package com.expense.logger.service;

import com.expense.logger.model.User;
import com.expense.logger.repository.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.UUID;

@Service
@Slf4j
public class NotificationServiceImpl implements NotificationService {

    private final NotificationCenterService notificationCenterService;
    private final UserRepository userRepository;

    public NotificationServiceImpl(NotificationCenterService notificationCenterService, UserRepository userRepository) {
        this.notificationCenterService = notificationCenterService;
        this.userRepository = userRepository;
    }

    @Override
    public void checkBudgetThresholds(UUID userId, Long categoryId, BigDecimal currentMonthSpent, BigDecimal limit, int thresholdPercent) {
        if (limit == null || limit.compareTo(BigDecimal.ZERO) <= 0) {
            return;
        }

        BigDecimal utilization = currentMonthSpent.multiply(new BigDecimal("100")).divide(limit, 2, RoundingMode.HALF_UP);
        BigDecimal threshold = BigDecimal.valueOf(thresholdPercent);

        String scope = (categoryId == null) ? "Global" : "Category ID " + categoryId;

        User user = userRepository.findById(userId).orElse(null);

        if (utilization.compareTo(new BigDecimal("100")) > 0) {
            log.warn("BUDGET_EXCEEDED: User {} has exceeded their {} budget limit! Spent: {}, Limit: {} ({}% utilized)", 
                    userId, scope, currentMonthSpent, limit, utilization);
            sendSimulatedEmail("user-" + userId + "@example.com", 
                    "Budget Limit Exceeded Alert", 
                    "You have spent " + currentMonthSpent + " out of your " + limit + " limit for " + scope + ".");
            if (user != null) {
                notificationCenterService.triggerNotification(
                        user,
                        "Budget Limit Exceeded",
                        "You have spent " + currentMonthSpent + " out of your " + limit + " limit for " + scope + " (" + utilization + "% utilized).",
                        "CRITICAL",
                        "BUDGET_WARNING"
                );
            }
        } else if (utilization.compareTo(threshold) >= 0) {
            log.warn("BUDGET_WARNING: User {} has breached warning threshold ({}%) for {} budget! Spent: {}, Limit: {} ({}% utilized)", 
                    userId, thresholdPercent, scope, currentMonthSpent, limit, utilization);
            sendSimulatedEmail("user-" + userId + "@example.com", 
                    "Budget Warning Threshold Breach Alert", 
                    "Your spending on " + scope + " has reached " + currentMonthSpent + " (" + utilization + "% of your limit).");
            if (user != null) {
                notificationCenterService.triggerNotification(
                        user,
                        "Budget Warning Threshold Breach",
                        "Your spending on " + scope + " has reached " + currentMonthSpent + " (" + utilization + "% of your limit).",
                        "WARNING",
                        "BUDGET_WARNING"
                );
            }
        }
    }

    @Override
    public void sendSimulatedEmail(String toEmail, String subject, String body) {
        log.info("[SIMULATED EMAIL QUEUE] To: {} | Subject: {} | Body: {}", toEmail, subject, body);
    }
}
