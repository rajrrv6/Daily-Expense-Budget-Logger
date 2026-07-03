package com.expense.logger.config;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Refill;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;

public class RedisRateLimitConfig {

    @Bean(name = "sendOtpBandwidth")
    public Bandwidth sendOtpBandwidth() {
        // Protect /api/v1/auth/send-otp: 10 requests / 15 mins per IP
        return Bandwidth.builder()
                .capacity(10)
                .refillIntervally(10, Duration.ofMinutes(15))
                .build();
    }

    @Bean(name = "verifyOtpBandwidth")
    public Bandwidth verifyOtpBandwidth() {
        // Protect /api/v1/auth/verify-otp: 20 requests / 15 mins per IP
        return Bandwidth.builder()
                .capacity(20)
                .refillIntervally(20, Duration.ofMinutes(15))
                .build();
    }

    @Bean(name = "loginBandwidth")
    public Bandwidth loginBandwidth() {
        // Protect /api/v1/auth/login: 10 requests / 5 mins per IP
        return Bandwidth.builder()
                .capacity(10)
                .refillIntervally(10, Duration.ofMinutes(5))
                .build();
    }

    @Bean(name = "refreshBandwidth")
    public Bandwidth refreshBandwidth() {
        // Protect /api/v1/auth/refresh: 15 requests / 5 mins per IP
        return Bandwidth.builder()
                .capacity(15)
                .refillIntervally(15, Duration.ofMinutes(5))
                .build();
    }
}
