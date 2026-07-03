package com.expense.logger.service;

public interface OtpAttemptTrackerService {
    void recordFailedAttempt(String email, String ip);
    void recordSuccessfulAttempt(String email, String ip);
    boolean isBlocked(String email, String ip);
    int getFailedAttempts(String email);
    int getFailedAttemptsIp(String ip);
    void resetFailedAttempts(String email, String ip);
}
