package com.expense.logger.service;

public interface RedisOtpSecurityService {
    boolean checkAndIncrementVerifyIpLimit(String ip);
    boolean checkAndIncrementSendIpLimit(String ip);
    void logSuspiciousIp(String ip, String endpoint, String event, String severity);
}
