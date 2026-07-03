package com.expense.logger.service;

public interface LoginAttemptService {
    boolean isIpBlocked(String ip);
    boolean isUserBlocked(String usernameOrEmail);
    void recordLoginAttempt(String ip);
    void recordFailedLoginAttempt(String usernameOrEmail);
    void resetUserAttempts(String usernameOrEmail);
    void recordFailedOtp(String usernameOrEmail, String ip);
    void recordRefreshAbuse(String usernameOrEmail, String ip);
}
