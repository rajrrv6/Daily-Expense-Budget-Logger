package com.expense.logger.service;

import com.expense.logger.config.OtpSecurityProperties;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.util.concurrent.TimeUnit;

@Service
@Slf4j
public class OtpAttemptTrackerServiceImpl implements OtpAttemptTrackerService {

    private static final String KEY_ATTEMPTS_EMAIL = "otp:attempts:email:";
    private static final String KEY_ATTEMPTS_IP = "otp:attempts:ip:";
    private static final String KEY_LOCKOUT_EMAIL = "otp:lockout:email:";
    private static final String KEY_LOCKOUT_IP = "otp:lockout:ip:";

    private final RedisTemplate<String, String> redisTemplate;
    private final OtpSecurityProperties properties;

    public OtpAttemptTrackerServiceImpl(RedisTemplate<String, String> redisTemplate,
                                        OtpSecurityProperties properties) {
        this.redisTemplate = redisTemplate;
        this.properties = properties;
    }

    @Override
    public void recordFailedAttempt(String email, String ip) {
        if (email == null || ip == null) return;
        
        String emailKey = KEY_ATTEMPTS_EMAIL + email;
        String ipKey = KEY_ATTEMPTS_IP + ip;

        try {
            Long emailCount = redisTemplate.opsForValue().increment(emailKey);
            if (emailCount != null && emailCount == 1) {
                redisTemplate.expire(emailKey, properties.getResendWindowMs(), TimeUnit.MILLISECONDS);
            }

            Long ipCount = redisTemplate.opsForValue().increment(ipKey);
            if (ipCount != null && ipCount == 1) {
                redisTemplate.expire(ipKey, properties.getResendWindowMs(), TimeUnit.MILLISECONDS);
            }

            log.info("Failed OTP attempt recorded. Email: {}, IP: {}, Email Failed: {}, IP Failed: {}",
                    email, ip, emailCount, ipCount);

            int maxAllowed = properties.getMaxAttempts();

            if (emailCount != null && emailCount >= maxAllowed) {
                redisTemplate.opsForValue().set(KEY_LOCKOUT_EMAIL + email, "locked", properties.getLockoutDurationMs(), TimeUnit.MILLISECONDS);
                log.warn("{\"event\":\"OTP_BRUTE_FORCE_DETECTED\",\"email\":\"{}\",\"ip\":\"{}\",\"attempts\":{},\"severity\":\"HIGH\"}",
                        email, ip, emailCount);
            }

            if (ipCount != null && ipCount >= maxAllowed) {
                redisTemplate.opsForValue().set(KEY_LOCKOUT_IP + ip, "locked", properties.getLockoutDurationMs(), TimeUnit.MILLISECONDS);
                log.warn("{\"event\":\"OTP_BRUTE_FORCE_DETECTED\",\"email\":\"{}\",\"ip\":\"{}\",\"attempts\":{},\"severity\":\"HIGH\"}",
                        email, ip, ipCount);
            }

        } catch (Exception e) {
            log.error("Redis connection failed during recording failed OTP attempt: ", e);
            throw new org.springframework.data.redis.RedisSystemException("Fail-Secure logic triggered: Redis cache offline.", e);
        }
    }

    @Override
    public void recordSuccessfulAttempt(String email, String ip) {
        resetFailedAttempts(email, ip);
    }

    @Override
    public boolean isBlocked(String email, String ip) {
        try {
            if (email != null) {
                Boolean isEmailBlocked = redisTemplate.hasKey(KEY_LOCKOUT_EMAIL + email);
                if (isEmailBlocked != null && isEmailBlocked) {
                    log.warn("Block match: user email is locked due to multiple failed OTP verifications. Email: {}", email);
                    return true;
                }
            }
            if (ip != null) {
                Boolean isIpBlocked = redisTemplate.hasKey(KEY_LOCKOUT_IP + ip);
                if (isIpBlocked != null && isIpBlocked) {
                    log.warn("Block match: client IP is locked due to multiple failed OTP verifications. IP: {}", ip);
                    return true;
                }
            }
            return false;
        } catch (Exception e) {
            log.error("Redis connection failed during block lookup check: ", e);
            throw new org.springframework.data.redis.RedisSystemException("Fail-Secure logic triggered: Redis cache offline.", e);
        }
    }

    @Override
    public int getFailedAttempts(String email) {
        if (email == null) return 0;
        try {
            String val = redisTemplate.opsForValue().get(KEY_ATTEMPTS_EMAIL + email);
            return val != null ? Integer.parseInt(val) : 0;
        } catch (Exception e) {
            return 0;
        }
    }

    @Override
    public int getFailedAttemptsIp(String ip) {
        if (ip == null) return 0;
        try {
            String val = redisTemplate.opsForValue().get(KEY_ATTEMPTS_IP + ip);
            return val != null ? Integer.parseInt(val) : 0;
        } catch (Exception e) {
            return 0;
        }
    }

    @Override
    public void resetFailedAttempts(String email, String ip) {
        try {
            if (email != null) {
                redisTemplate.delete(KEY_ATTEMPTS_EMAIL + email);
                redisTemplate.delete(KEY_LOCKOUT_EMAIL + email);
            }
            if (ip != null) {
                redisTemplate.delete(KEY_ATTEMPTS_IP + ip);
                redisTemplate.delete(KEY_LOCKOUT_IP + ip);
            }
            log.info("Reset failed OTP attempts for Email: {}, IP: {}", email, ip);
        } catch (Exception e) {
            log.error("Redis connection failed during failed attempts reset: ", e);
            throw new org.springframework.data.redis.RedisSystemException("Fail-Secure logic triggered: Redis cache offline.", e);
        }
    }
}
