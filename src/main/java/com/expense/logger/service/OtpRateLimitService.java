package com.expense.logger.service;

public interface OtpRateLimitService {
    boolean canSendOtp(String email);
    void recordOtpSent(String email);
    long getCooldownRemainingSeconds(String email);
}
