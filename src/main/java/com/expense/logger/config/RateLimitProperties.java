package com.expense.logger.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "app.rate-limit")
@Data
public class RateLimitProperties {

    private Login login = new Login();
    private int lockoutMinutes = 15;
    private Refresh refresh = new Refresh();
    private Admin admin = new Admin();

    @Data
    public static class Login {
        private int maxAttempts = 5;
        private int windowMinutes = 1;
    }

    @Data
    public static class Refresh {
        private int maxAttempts = 15;
        private int windowMinutes = 5;
    }

    @Data
    public static class Admin {
        private int maxAttempts = 30;
        private int windowMinutes = 1;
    }
}
