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
        
        int maxAttempts = 3;
        int delayMs = 100; // Small delay for test run efficiency, standard exponential backoff
        
        for (int attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                jakarta.mail.internet.MimeMessage mimeMessage = mailSender.createMimeMessage();
                org.springframework.mail.javamail.MimeMessageHelper helper = 
                        new org.springframework.mail.javamail.MimeMessageHelper(mimeMessage, true, "UTF-8");
                
                helper.setTo(to);
                helper.setSubject(subject);
                helper.setFrom("no-reply@budgetlogger.com");
                
                // Auto-detect if body content is HTML or plaintext
                boolean isHtml = body != null && (
                        body.trim().startsWith("<html") || 
                        body.trim().startsWith("<!DOCTYPE") || 
                        body.trim().startsWith("<div")
                );
                
                helper.setText(body, isHtml);

                mailSender.send(mimeMessage);
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
