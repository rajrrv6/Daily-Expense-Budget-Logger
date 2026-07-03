package com.expense.logger.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "app.security.otp")
@Data
public class OtpSecurityProperties {
    private int maxAttempts = 5;
    private long lockoutDurationMs = 15 * 60 * 1000; // 15 minutes
    private long resendCooldownMs = 60 * 1000; // 60 seconds
    private int maxResendsInWindow = 3;
    private long resendWindowMs = 10 * 60 * 1000; // 10 minutes
    
    private int ipVerifyLimit = 20;
    private int ipVerifyWindowMinutes = 15;
    
    private int ipSendLimit = 10;
    private int ipSendWindowMinutes = 15;
}
