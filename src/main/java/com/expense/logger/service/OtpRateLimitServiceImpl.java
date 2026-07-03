package com.expense.logger.service;

import com.expense.logger.config.OtpSecurityProperties;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.util.concurrent.TimeUnit;

@Service
@Slf4j
public class OtpRateLimitServiceImpl implements OtpRateLimitService {

    private static final String KEY_COOLDOWN = "otp:cooldown:";
    private static final String KEY_RESEND_COUNT = "otp:resend:";

    private final RedisTemplate<String, String> redisTemplate;
    private final OtpSecurityProperties properties;

    public OtpRateLimitServiceImpl(RedisTemplate<String, String> redisTemplate,
                                   OtpSecurityProperties properties) {
        this.redisTemplate = redisTemplate;
        this.properties = properties;
    }

    @Override
    public boolean canSendOtp(String email) {
        if (email == null) return false;

        try {
            // 1. Check individual resend cooldown (60 seconds)
            Boolean hasCooldown = redisTemplate.hasKey(KEY_COOLDOWN + email);
            if (hasCooldown != null && hasCooldown) {
                log.warn("Rate limit check failed: OTP resend cooldown active for email {}", email);
                return false;
            }

            // 2. Check total sends in window (max 3 sends in 10 minutes)
            String resendVal = redisTemplate.opsForValue().get(KEY_RESEND_COUNT + email);
            if (resendVal != null) {
                int sendCount = Integer.parseInt(resendVal);
                if (sendCount >= properties.getMaxResendsInWindow()) {
                    log.warn("Rate limit check failed: Maximum OTP sends ({}) reached in 10-minute window for email {}",
                            properties.getMaxResendsInWindow(), email);
                    return false;
                }
            }

            return true;
        } catch (Exception e) {
            log.error("Redis connection failed during canSendOtp lookup: ", e);
            throw new org.springframework.data.redis.RedisSystemException("Fail-Secure rate limit logic triggered: Redis offline.", e);
        }
    }

    @Override
    public void recordOtpSent(String email) {
        if (email == null) return;

        String cooldownKey = KEY_COOLDOWN + email;
        String resendKey = KEY_RESEND_COUNT + email;

        try {
            // Set cooldown active
            redisTemplate.opsForValue().set(cooldownKey, "active", properties.getResendCooldownMs(), TimeUnit.MILLISECONDS);

            // Increment send count window
            Long count = redisTemplate.opsForValue().increment(resendKey);
            if (count != null && count == 1) {
                redisTemplate.expire(resendKey, properties.getResendWindowMs(), TimeUnit.MILLISECONDS);
            }

            log.info("Recorded OTP sent event for {}. Current window count: {}", email, count);
        } catch (Exception e) {
            log.error("Redis connection failed while recording sent OTP state: ", e);
            throw new org.springframework.data.redis.RedisSystemException("Fail-Secure rate limit logic triggered: Redis offline.", e);
        }
    }

    @Override
    public long getCooldownRemainingSeconds(String email) {
        if (email == null) return 0;
        try {
            Long expireTime = redisTemplate.getExpire(KEY_COOLDOWN + email, TimeUnit.SECONDS);
            return expireTime != null && expireTime > 0 ? expireTime : 0;
        } catch (Exception e) {
            return 0;
        }
    }
}
