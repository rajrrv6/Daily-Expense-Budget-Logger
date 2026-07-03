package com.expense.logger.service;

import com.expense.logger.security.JwtTokenProvider;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.util.Date;
import java.util.concurrent.TimeUnit;

@Service
@Slf4j
public class JwtBlacklistServiceImpl implements JwtBlacklistService {

    private static final String REDIS_KEY_PREFIX = "blacklist:jti:";
    private static final String REDIS_USER_PREFIX = "blacklist:user:";
    
    private final RedisTemplate<String, String> redisTemplate;
    private final JwtTokenProvider tokenProvider;

    @Value("${app.security.redis.fail-secure:true}")
    private boolean failSecure;

    public JwtBlacklistServiceImpl(RedisTemplate<String, String> redisTemplate,
                                   JwtTokenProvider tokenProvider) {
        this.redisTemplate = redisTemplate;
        this.tokenProvider = tokenProvider;
    }

    @Override
    public void blacklistToken(String token) {
        try {
            String jti = tokenProvider.getJtiFromJwt(token);
            Date expiry = tokenProvider.getExpirationFromJwt(token);
            long diffMs = expiry.getTime() - System.currentTimeMillis();
            
            if (diffMs > 0) {
                blacklistJti(jti, diffMs);
            }
        } catch (Exception e) {
            log.error("Failed to blacklist JWT token: ", e);
            handleRedisFailure("Failed to write to Redis blacklist during token revocation");
        }
    }

    @Override
    public void blacklistJti(String jti, long expirationMs) {
        if (jti == null || jti.trim().isEmpty()) {
            return;
        }
        String key = REDIS_KEY_PREFIX + jti;
        try {
            redisTemplate.opsForValue().set(key, "revoked", expirationMs, TimeUnit.MILLISECONDS);
            log.info("Blacklisted JWT JTI: {} with TTL: {} ms", jti, expirationMs);
        } catch (Exception e) {
            log.error("Redis error during JTI blacklist write: ", e);
            handleRedisFailure("Redis write failed");
        }
    }

    @Override
    public boolean isBlacklisted(String token) {
        try {
            String jti = tokenProvider.getJtiFromJwt(token);
            if (jti == null || jti.trim().isEmpty()) {
                return false;
            }
            String key = REDIS_KEY_PREFIX + jti;
            Boolean isPresent = redisTemplate.hasKey(key);
            return isPresent != null && isPresent;
        } catch (Exception e) {
            log.error("Redis connection failed during blacklist lookup: ", e);
            // Propagate exception to trigger fail-secure logic
            handleRedisFailure("Redis lookup failed");
            // If fail-secure is disabled, we default to fail-open (not blacklisted)
            return false;
        }
    }

    @Override
    public void blacklistUser(String username, long durationMs) {
        if (username == null || username.trim().isEmpty()) {
            return;
        }
        String key = REDIS_USER_PREFIX + username;
        try {
            redisTemplate.opsForValue().set(key, "locked", durationMs, TimeUnit.MILLISECONDS);
            log.info("Blacklisted user session: {} for duration: {} ms", username, durationMs);
        } catch (Exception e) {
            log.error("Redis error during user blacklist write: ", e);
            handleRedisFailure("Redis write failed");
        }
    }

    @Override
    public boolean isUserBlacklisted(String username) {
        if (username == null || username.trim().isEmpty()) {
            return false;
        }
        String key = REDIS_USER_PREFIX + username;
        try {
            Boolean isPresent = redisTemplate.hasKey(key);
            return isPresent != null && isPresent;
        } catch (Exception e) {
            log.error("Redis connection failed during user blacklist lookup: ", e);
            handleRedisFailure("Redis lookup failed");
            return false;
        }
    }

    @Override
    public void clearBlacklist() {
        try {
            java.util.Set<String> keys = redisTemplate.keys(REDIS_KEY_PREFIX + "*");
            if (keys != null && !keys.isEmpty()) {
                redisTemplate.delete(keys);
            }
            java.util.Set<String> userKeys = redisTemplate.keys(REDIS_USER_PREFIX + "*");
            if (userKeys != null && !userKeys.isEmpty()) {
                redisTemplate.delete(userKeys);
            }
            log.info("Redis blacklist caches cleared successfully.");
        } catch (Exception e) {
            log.error("Failed to clear Redis blacklist: ", e);
        }
    }

    private void handleRedisFailure(String message) {
        if (failSecure) {
            throw new org.springframework.data.redis.RedisSystemException(
                    "Redis cache layer is offline. Security enforcement blocks access (fail-secure strategy). Details: " + message, 
                    new RuntimeException()
            );
        }
    }
}
