package com.expense.logger.service;

import com.expense.logger.config.RateLimitProperties;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.util.concurrent.TimeUnit;

@Service
@Slf4j
public class LoginAttemptServiceImpl implements LoginAttemptService {

    private static final String KEY_LOGIN_IP = "login:ip:";
    private static final String KEY_LOGIN_USER = "login:user:";
    private static final String KEY_OTP_IP = "otp:ip:";
    private static final String KEY_OTP_USER = "otp:user:";

    private final RedisTemplate<String, String> redisTemplate;
    private final RateLimitProperties properties;

    public LoginAttemptServiceImpl(RedisTemplate<String, String> redisTemplate,
                                   RateLimitProperties properties) {
        this.redisTemplate = redisTemplate;
        this.properties = properties;
    }

    @Override
    public boolean isIpBlocked(String ip) {
        if (ip == null) return false;
        try {
            String val = redisTemplate.opsForValue().get(KEY_LOGIN_IP + ip);
            if (val != null) {
                int attempts = Integer.parseInt(val);
                return attempts >= properties.getLogin().getMaxAttempts();
            }
            return false;
        } catch (Exception e) {
            log.error("Redis connection failed in isIpBlocked lookup for IP {}: ", ip, e);
            throw new org.springframework.data.redis.RedisSystemException("Fail-Secure logic triggered: Redis offline.", e);
        }
    }

    @Override
    public boolean isUserBlocked(String usernameOrEmail) {
        if (usernameOrEmail == null) return false;
        try {
            String val = redisTemplate.opsForValue().get(KEY_LOGIN_USER + usernameOrEmail);
            if (val != null) {
                int failedAttempts = Integer.parseInt(val);
                return failedAttempts >= properties.getLogin().getMaxAttempts();
            }
            return false;
        } catch (Exception e) {
            log.error("Redis connection failed in isUserBlocked lookup for user {}: ", usernameOrEmail, e);
            throw new org.springframework.data.redis.RedisSystemException("Fail-Secure logic triggered: Redis offline.", e);
        }
    }

    @Override
    public void recordLoginAttempt(String ip) {
        if (ip == null) return;
        String key = KEY_LOGIN_IP + ip;
        try {
            Long count = redisTemplate.opsForValue().increment(key);
            if (count != null && count == 1) {
                redisTemplate.expire(key, properties.getLogin().getWindowMinutes(), TimeUnit.MINUTES);
            }
            log.debug("Recorded login attempt for IP {}. Current count in window: {}", ip, count);
        } catch (Exception e) {
            log.error("Redis connection failed while recording login attempt for IP {}: ", ip, e);
            throw new org.springframework.data.redis.RedisSystemException("Fail-Secure logic triggered: Redis offline.", e);
        }
    }

    @Override
    public void recordFailedLoginAttempt(String usernameOrEmail) {
        if (usernameOrEmail == null) return;
        String key = KEY_LOGIN_USER + usernameOrEmail;
        try {
            Long count = redisTemplate.opsForValue().increment(key);
            if (count != null && count == 1) {
                redisTemplate.expire(key, properties.getLockoutMinutes(), TimeUnit.MINUTES);
            }
            log.warn("Recorded failed login attempt for user {}. Consecutive failed count: {}", usernameOrEmail, count);
            if (count != null && count >= properties.getLogin().getMaxAttempts()) {
                log.error("Security Event: User account {} has been locked out for {} minutes due to consecutive failed logins.",
                        usernameOrEmail, properties.getLockoutMinutes());
            }
        } catch (Exception e) {
            log.error("Redis connection failed while recording failed login attempt for user {}: ", usernameOrEmail, e);
            throw new org.springframework.data.redis.RedisSystemException("Fail-Secure logic triggered: Redis offline.", e);
        }
    }

    @Override
    public void resetUserAttempts(String usernameOrEmail) {
        if (usernameOrEmail == null) return;
        try {
            redisTemplate.delete(KEY_LOGIN_USER + usernameOrEmail);
            log.info("Reset login attempts and lockouts for user {}", usernameOrEmail);
        } catch (Exception e) {
            log.error("Redis connection failed while resetting login attempts for user {}: ", usernameOrEmail, e);
            throw new org.springframework.data.redis.RedisSystemException("Fail-Secure logic triggered: Redis offline.", e);
        }
    }

    @Override
    public void recordFailedOtp(String usernameOrEmail, String ip) {
        if (usernameOrEmail != null) {
            String userKey = KEY_OTP_USER + usernameOrEmail;
            try {
                Long count = redisTemplate.opsForValue().increment(userKey);
                if (count != null && count == 1) {
                    redisTemplate.expire(userKey, properties.getLockoutMinutes(), TimeUnit.MINUTES);
                }
            } catch (Exception e) {
                log.error("Redis connection failed recording failed OTP for user {}: ", usernameOrEmail, e);
            }
        }
        if (ip != null) {
            String ipKey = KEY_OTP_IP + ip;
            try {
                Long count = redisTemplate.opsForValue().increment(ipKey);
                if (count != null && count == 1) {
                    redisTemplate.expire(ipKey, properties.getLockoutMinutes(), TimeUnit.MINUTES);
                }
            } catch (Exception e) {
                log.error("Redis connection failed recording failed OTP for IP {}: ", ip, e);
            }
        }
    }

    @Override
    public void recordRefreshAbuse(String usernameOrEmail, String ip) {
        log.warn("Security Alert: Suspicious token refresh activity detected for user {} on IP {}.", usernameOrEmail, ip);
    }
}
