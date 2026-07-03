package com.expense.logger.config;

import com.expense.logger.service.RedisOtpSecurityService;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
public class RateLimitFilter extends OncePerRequestFilter {

    private final RedisOtpSecurityService redisOtpSecurityService;
    private final ObjectMapper objectMapper;

    // Cache of Buckets per IP per endpoint
    private final Map<String, Bucket> sendOtpBuckets = new ConcurrentHashMap<>();
    private final Map<String, Bucket> verifyOtpBuckets = new ConcurrentHashMap<>();
    private final Map<String, Bucket> loginBuckets = new ConcurrentHashMap<>();
    private final Map<String, Bucket> refreshBuckets = new ConcurrentHashMap<>();

    private final Bandwidth sendOtpLimit;
    private final Bandwidth verifyOtpLimit;
    private final Bandwidth loginLimit;
    private final Bandwidth refreshLimit;

    public RateLimitFilter(RedisOtpSecurityService redisOtpSecurityService,
                           ObjectMapper objectMapper,
                           @Qualifier("sendOtpBandwidth") Bandwidth sendOtpLimit,
                           @Qualifier("verifyOtpBandwidth") Bandwidth verifyOtpLimit,
                           @Qualifier("loginBandwidth") Bandwidth loginLimit,
                           @Qualifier("refreshBandwidth") Bandwidth refreshLimit) {
        this.redisOtpSecurityService = redisOtpSecurityService;
        this.objectMapper = objectMapper;
        this.sendOtpLimit = sendOtpLimit;
        this.verifyOtpLimit = verifyOtpLimit;
        this.loginLimit = loginLimit;
        this.refreshLimit = refreshLimit;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String path = request.getRequestURI();
        String ip = getClientIp(request);

        try {
            if (path.equals("/api/v1/auth/send-otp") || path.equals("/api/v1/auth/resend-otp")) {
                if (!consumeLocalToken(ip, sendOtpBuckets, sendOtpLimit) || !redisOtpSecurityService.checkAndIncrementSendIpLimit(ip)) {
                    sendRateLimitError(response, "Too many OTP send requests. Please wait and try again.");
                    return;
                }
            } else if (path.equals("/api/v1/auth/verify-otp")) {
                if (!consumeLocalToken(ip, verifyOtpBuckets, verifyOtpLimit) || !redisOtpSecurityService.checkAndIncrementVerifyIpLimit(ip)) {
                    sendRateLimitError(response, "Too many verification attempts. IP blocked temporarily.");
                    return;
                }
            } else if (path.equals("/api/v1/auth/login")) {
                if (!consumeLocalToken(ip, loginBuckets, loginLimit)) {
                    sendRateLimitError(response, "Too many login attempts. Please slow down.");
                    return;
                }
            } else if (path.equals("/api/v1/auth/refresh")) {
                if (!consumeLocalToken(ip, refreshBuckets, refreshLimit)) {
                    sendRateLimitError(response, "Too many token refresh requests. Please slow down.");
                    return;
                }
            }
        } catch (org.springframework.data.redis.RedisSystemException ex) {
            log.error("Redis system failure in RateLimitFilter: triggering fail-secure block.", ex);
            sendServiceUnavailableError(response, "Security enforcement rate-limit block: Centralized cache layer is offline.");
            return;
        }

        filterChain.doFilter(request, response);
    }

    private boolean consumeLocalToken(String ip, Map<String, Bucket> bucketMap, Bandwidth limit) {
        Bucket bucket = bucketMap.computeIfAbsent(ip, key -> Bucket.builder().addLimit(limit).build());
        return bucket.tryConsume(1);
    }

    private String getClientIp(HttpServletRequest request) {
        String xfHeader = request.getHeader("X-Forwarded-For");
        if (xfHeader == null || xfHeader.isEmpty()) {
            return request.getRemoteAddr();
        }
        return xfHeader.split(",")[0].trim();
    }

    private void sendRateLimitError(HttpServletResponse response, String message) throws IOException {
        response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        Map<String, Object> errorDetails = Map.of(
                "status", HttpStatus.TOO_MANY_REQUESTS.value(),
                "error", "Too Many Requests",
                "message", message
        );
        response.getWriter().write(objectMapper.writeValueAsString(errorDetails));
    }

    private void sendServiceUnavailableError(HttpServletResponse response, String message) throws IOException {
        response.setStatus(HttpStatus.SERVICE_UNAVAILABLE.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        Map<String, Object> errorDetails = Map.of(
                "status", HttpStatus.SERVICE_UNAVAILABLE.value(),
                "error", "Service Unavailable",
                "message", message
        );
        response.getWriter().write(objectMapper.writeValueAsString(errorDetails));
    }

    public void clearBuckets() {
        sendOtpBuckets.clear();
        verifyOtpBuckets.clear();
        loginBuckets.clear();
        refreshBuckets.clear();
        log.info("Rate limit filter buckets cleared.");
    }
}
