package com.expense.logger.service;

public interface EmailService {
    void sendEmail(String to, String subject, String body);
}
