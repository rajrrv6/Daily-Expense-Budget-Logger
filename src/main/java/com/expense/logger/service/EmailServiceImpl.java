package com.expense.logger.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class EmailServiceImpl implements EmailService {

    private final JavaMailSender mailSender;

    public EmailServiceImpl(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    @Override
    @Async("taskExecutor")
    public void sendEmail(String to, String subject, String body) {
        log.info("Starting async email dispatch to: {}", to);
        
        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(to);
        message.setSubject(subject);
        message.setText(body);
        message.setFrom("no-reply@budgetlogger.com");

        int maxAttempts = 3;
        int delayMs = 100; // Small delay for test run efficiency, standard exponential backoff
        
        for (int attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                mailSender.send(message);
                log.info("Email successfully sent to {} on attempt {}", to, attempt);
                return;
            } catch (Exception e) {
                log.warn("Failed to send email to {} on attempt {} of {}: {}", to, attempt, maxAttempts, e.getMessage());
                if (attempt == maxAttempts) {
                    log.error("SMTP delivery permanently failed for to={}", to, e);
                    throw new RuntimeException("Permanently failed to send email", e);
                }
                try {
                    Thread.sleep((long) delayMs * attempt);
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    throw new RuntimeException(ie);
                }
            }
        }
    }
}
