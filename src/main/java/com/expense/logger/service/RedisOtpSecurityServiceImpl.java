package com.expense.logger.service;

import com.expense.logger.config.OtpSecurityProperties;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.util.concurrent.TimeUnit;

@Service
@Slf4j
public class RedisOtpSecurityServiceImpl implements RedisOtpSecurityService {

    private static final String KEY_IP_VERIFY_LIMIT = "otp:ip:verify:limit:";
    private static final String KEY_IP_SEND_LIMIT = "otp:ip:send:limit:";

    private final RedisTemplate<String, String> redisTemplate;
    private final OtpSecurityProperties properties;

    public RedisOtpSecurityServiceImpl(RedisTemplate<String, String> redisTemplate,
                                       OtpSecurityProperties properties) {
        this.redisTemplate = redisTemplate;
        this.properties = properties;
    }

    @Override
    public boolean checkAndIncrementVerifyIpLimit(String ip) {
        if (ip == null) return false;

        String key = KEY_IP_VERIFY_LIMIT + ip;
        try {
            Long count = redisTemplate.opsForValue().increment(key);
            if (count != null && count == 1) {
                redisTemplate.expire(key, properties.getIpVerifyWindowMinutes(), TimeUnit.MINUTES);
            }

            int allowed = properties.getIpVerifyLimit();
            if (count != null && count > allowed) {
                logSuspiciousIp(ip, "/api/v1/auth/verify-otp", "IP_VERIFICATION_ATTEMPTS_EXCEEDED", "HIGH");
                return false;
            }

            return true;
        } catch (Exception e) {
            log.error("Redis connection failed during IP verification rate limit check: ", e);
            throw new org.springframework.data.redis.RedisSystemException("Fail-Secure limit check active: Redis offline.", e);
        }
    }

    @Override
    public boolean checkAndIncrementSendIpLimit(String ip) {
        if (ip == null) return false;

        String key = KEY_IP_SEND_LIMIT + ip;
        try {
            Long count = redisTemplate.opsForValue().increment(key);
            if (count != null && count == 1) {
                redisTemplate.expire(key, properties.getIpSendWindowMinutes(), TimeUnit.MINUTES);
            }

            int allowed = properties.getIpSendLimit();
            if (count != null && count > allowed) {
                logSuspiciousIp(ip, "/api/v1/auth/send-otp", "IP_SEND_ATTEMPTS_EXCEEDED", "HIGH");
                return false;
            }

            return true;
        } catch (Exception e) {
            log.error("Redis connection failed during IP send rate limit check: ", e);
            throw new org.springframework.data.redis.RedisSystemException("Fail-Secure limit check active: Redis offline.", e);
        }
    }

    @Override
    public void logSuspiciousIp(String ip, String endpoint, String event, String severity) {
        log.warn("{\"event\":\"SUSPICIOUS_IP_DETECTED\",\"ip\":\"{}\",\"endpoint\":\"{}\",\"details\":\"OTP rate limits breached: {}\",\"severity\":\"{}\"}",
                ip, endpoint, event, severity);
    }
}
