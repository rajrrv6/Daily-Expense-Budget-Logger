package com.expense.logger.config;

import com.expense.logger.dto.RateLimitResponseDto;
import com.expense.logger.dto.UserLoginRequestDto;
import com.expense.logger.service.LoginAttemptService;
import com.expense.logger.service.RedisOtpSecurityService;
import com.expense.logger.service.OtpAttemptTrackerService;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.StreamUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
@Slf4j
public class ApiRateLimitFilter extends OncePerRequestFilter {

    private final LoginAttemptService loginAttemptService;
    private final RedisOtpSecurityService redisOtpSecurityService;
    private final OtpAttemptTrackerService otpAttemptTrackerService;
    private final ObjectMapper objectMapper;
    private final RateLimitProperties properties;

    // Cache of Buckets per IP per endpoint group
    private final Map<String, Bucket> loginBuckets = new ConcurrentHashMap<>();
    private final Map<String, Bucket> verifyOtpBuckets = new ConcurrentHashMap<>();
    private final Map<String, Bucket> sendOtpBuckets = new ConcurrentHashMap<>();
    private final Map<String, Bucket> refreshBuckets = new ConcurrentHashMap<>();
    private final Map<String, Bucket> adminBuckets = new ConcurrentHashMap<>();
    private final Map<String, Bucket> generalBuckets = new ConcurrentHashMap<>();

    public ApiRateLimitFilter(LoginAttemptService loginAttemptService,
                              RedisOtpSecurityService redisOtpSecurityService,
                              OtpAttemptTrackerService otpAttemptTrackerService,
                              ObjectMapper objectMapper,
                              RateLimitProperties properties) {
        this.loginAttemptService = loginAttemptService;
        this.redisOtpSecurityService = redisOtpSecurityService;
        this.otpAttemptTrackerService = otpAttemptTrackerService;
        this.objectMapper = objectMapper;
        this.properties = properties;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String path = request.getRequestURI();
        String method = request.getMethod();
        String ip = getClientIp(request);
        HttpServletRequest requestToProcess = request;

        try {
            // 1. IP and User checking for Login Endpoint
            if (path.equals("/api/v1/auth/login") && "POST".equalsIgnoreCase(method)) {
                // Wrap the request to cache the JSON body so we can inspect usernameOrEmail and still parse it later
                CachedBodyHttpServletRequest wrappedRequest = new CachedBodyHttpServletRequest(request);
                requestToProcess = wrappedRequest;

                String body = new String(wrappedRequest.getCachedBody(), StandardCharsets.UTF_8);
                String usernameOrEmail = null;
                try {
                    UserLoginRequestDto loginDto = objectMapper.readValue(body, UserLoginRequestDto.class);
                    if (loginDto != null) {
                        usernameOrEmail = loginDto.getUsernameOrEmail();
                    }
                } catch (Exception e) {
                    log.warn("Failed to parse request body for rate-limiting check on login: {}", e.getMessage());
                }

                // Check username/email block status in Redis first
                if (usernameOrEmail != null && loginAttemptService.isUserBlocked(usernameOrEmail)) {
                    log.warn("Rate Limit Block: Username/email {} is locked out due to multiple failed login attempts.", usernameOrEmail);
                    sendRateLimitError(response, "Rate limit exceeded. Account is locked. Please retry later.", path);
                    return;
                }

                // Check IP block status in Redis
                if (loginAttemptService.isIpBlocked(ip)) {
                    log.warn("Rate Limit Block: IP {} is locked out due to excessive login attempts.", ip);
                    sendRateLimitError(response, "Rate limit exceeded. Too many login attempts from this IP. Please retry later.", path);
                    return;
                }

                // Apply Token Bucket check
                Bandwidth limit = Bandwidth.builder()
                        .capacity(properties.getLogin().getMaxAttempts())
                        .refillIntervally(properties.getLogin().getMaxAttempts(), Duration.ofMinutes(properties.getLogin().getWindowMinutes()))
                        .build();
                if (!consumeToken(ip, loginBuckets, limit)) {
                    log.warn("Rate Limit Block: Login token bucket exhausted for IP {}.", ip);
                    sendRateLimitError(response, "Too many login attempts. Please slow down.", path);
                    return;
                }

                // Record the attempt in Redis
                loginAttemptService.recordLoginAttempt(ip);
            }

            // 2. OTP Verification check
            else if (path.equals("/api/v1/auth/verify-otp") && "POST".equalsIgnoreCase(method)) {
                CachedBodyHttpServletRequest wrappedRequest = new CachedBodyHttpServletRequest(request);
                requestToProcess = wrappedRequest;

                String body = new String(wrappedRequest.getCachedBody(), StandardCharsets.UTF_8);
                String email = null;
                try {
                    Map<?, ?> map = objectMapper.readValue(body, Map.class);
                    if (map != null && map.get("email") != null) {
                        email = map.get("email").toString();
                    }
                } catch (Exception e) {
                    log.warn("Failed to parse request body for OTP verification rate-limit check: {}", e.getMessage());
                }

                // Check if blocked via OTP Attempt Tracker (Redis-backed counter)
                if (otpAttemptTrackerService.isBlocked(email, ip)) {
                    log.warn("Rate Limit Block: OTP verification blocked for Email: {} / IP: {} due to brute force protection.", email, ip);
                    response.setStatus(HttpStatus.FORBIDDEN.value());
                    response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                    Map<String, Object> errorDetails = Map.of(
                            "status", HttpStatus.FORBIDDEN.value(),
                            "error", "Forbidden",
                            "message", "Verification attempts locked. Too many failures."
                    );
                    response.getWriter().write(objectMapper.writeValueAsString(errorDetails));
                    return;
                }

                // Check IP verify rate limit in Redis
                if (!redisOtpSecurityService.checkAndIncrementVerifyIpLimit(ip)) {
                    sendRateLimitError(response, "Too many verification attempts. IP blocked temporarily.", path);
                    return;
                }

                // Apply Token Bucket check
                Bandwidth limit = Bandwidth.builder()
                        .capacity(20)
                        .refillIntervally(20, Duration.ofMinutes(15))
                        .build();
                if (!consumeToken(ip, verifyOtpBuckets, limit)) {
                    sendRateLimitError(response, "Too many verification attempts. Please slow down.", path);
                    return;
                }
            }

            // 3. OTP Send check
            else if ((path.equals("/api/v1/auth/send-otp") || path.equals("/api/v1/auth/resend-otp")) && "POST".equalsIgnoreCase(method)) {
                // Check IP send rate limit in Redis
                if (!redisOtpSecurityService.checkAndIncrementSendIpLimit(ip)) {
                    sendRateLimitError(response, "Too many OTP send requests. Please wait and try again.", path);
                    return;
                }

                // Apply Token Bucket check
                Bandwidth limit = Bandwidth.builder()
                        .capacity(10)
                        .refillIntervally(10, Duration.ofMinutes(15))
                        .build();
                if (!consumeToken(ip, sendOtpBuckets, limit)) {
                    sendRateLimitError(response, "Too many OTP send requests. Please wait and try again.", path);
                    return;
                }
            }

            // 4. Token Refresh check
            else if (path.equals("/api/v1/auth/refresh") && "POST".equalsIgnoreCase(method)) {
                // Apply Token Bucket check
                Bandwidth limit = Bandwidth.builder()
                        .capacity(properties.getRefresh().getMaxAttempts())
                        .refillIntervally(properties.getRefresh().getMaxAttempts(), Duration.ofMinutes(properties.getRefresh().getWindowMinutes()))
                        .build();
                if (!consumeToken(ip, refreshBuckets, limit)) {
                    sendRateLimitError(response, "Too many token refresh requests. Please slow down.", path);
                    return;
                }
            }

            // 5. Admin Routes check
            else if (path.startsWith("/api/v1/admin/")) {
                // Apply Token Bucket check
                Bandwidth limit = Bandwidth.builder()
                        .capacity(properties.getAdmin().getMaxAttempts())
                        .refillIntervally(properties.getAdmin().getMaxAttempts(), Duration.ofMinutes(properties.getAdmin().getWindowMinutes()))
                        .build();
                if (!consumeToken(ip, adminBuckets, limit)) {
                    log.error("Security Alert: IP {} exceeded admin endpoint rate limits.", ip);
                    sendRateLimitError(response, "Too many admin requests. Access throttled.", path);
                    return;
                }
            }

            // 6. Generic Users Routes check
            else if (path.startsWith("/api/v1/users/")) {
                // Apply standard Token Bucket check (e.g. 100 requests per minute)
                Bandwidth limit = Bandwidth.builder()
                        .capacity(100)
                        .refillIntervally(100, Duration.ofMinutes(1))
                        .build();
                if (!consumeToken(ip, generalBuckets, limit)) {
                    sendRateLimitError(response, "Rate limit exceeded. Please try again later.", path);
                    return;
                }
            }

        } catch (org.springframework.data.redis.RedisSystemException ex) {
            log.error("Redis system failure detected in ApiRateLimitFilter: activating fail-secure block for path: {}", path, ex);
            sendServiceUnavailableError(response, "Security enforcement rate-limit block: Centralized cache layer is offline.", path);
            return;
        } catch (Exception ex) {
            log.error("Unexpected error in ApiRateLimitFilter: ", ex);
        }

        filterChain.doFilter(requestToProcess, response);
    }

    private boolean consumeToken(String ip, Map<String, Bucket> bucketMap, Bandwidth limit) {
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

    private void sendRateLimitError(HttpServletResponse response, String message, String path) throws IOException {
        response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setHeader("Retry-After", "60");

        RateLimitResponseDto errorDetails = RateLimitResponseDto.builder()
                .timestamp(LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME))
                .status(HttpStatus.TOO_MANY_REQUESTS.value())
                .error("Too Many Requests")
                .message(message)
                .path(path)
                .build();

        response.getWriter().write(objectMapper.writeValueAsString(errorDetails));
    }

    private void sendServiceUnavailableError(HttpServletResponse response, String message, String path) throws IOException {
        response.setStatus(HttpStatus.SERVICE_UNAVAILABLE.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);

        RateLimitResponseDto errorDetails = RateLimitResponseDto.builder()
                .timestamp(LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME))
                .status(HttpStatus.SERVICE_UNAVAILABLE.value())
                .error("Service Unavailable")
                .message(message)
                .path(path)
                .build();

        response.getWriter().write(objectMapper.writeValueAsString(errorDetails));
    }

    public void clearBuckets() {
        loginBuckets.clear();
        verifyOtpBuckets.clear();
        sendOtpBuckets.clear();
        refreshBuckets.clear();
        adminBuckets.clear();
        generalBuckets.clear();
        log.info("API Rate limit filter buckets cleared.");
    }

    // Static nested class to handle cached body request wrapping
    private static class CachedBodyHttpServletRequest extends HttpServletRequestWrapper {
        private final byte[] cachedBody;

        public CachedBodyHttpServletRequest(HttpServletRequest request) throws IOException {
            super(request);
            this.cachedBody = StreamUtils.copyToByteArray(request.getInputStream());
        }

        @Override
        public ServletInputStream getInputStream() throws IOException {
            return new CachedBodyServletInputStream(this.cachedBody);
        }

        @Override
        public java.io.BufferedReader getReader() throws IOException {
            ByteArrayInputStream byteArrayInputStream = new ByteArrayInputStream(this.cachedBody);
            return new java.io.BufferedReader(new java.io.InputStreamReader(byteArrayInputStream, java.nio.charset.StandardCharsets.UTF_8));
        }

        public byte[] getCachedBody() {
            return this.cachedBody;
        }
    }

    private static class CachedBodyServletInputStream extends ServletInputStream {
        private final ByteArrayInputStream cachedBodyInputStream;

        public CachedBodyServletInputStream(byte[] cachedBody) {
            this.cachedBodyInputStream = new ByteArrayInputStream(cachedBody);
        }

        @Override
        public boolean isFinished() {
            return cachedBodyInputStream.available() == 0;
        }

        @Override
        public boolean isReady() {
            return true;
        }

        @Override
        public void setReadListener(ReadListener readListener) {
            throw new UnsupportedOperationException();
        }

        @Override
        public int read() throws IOException {
            return cachedBodyInputStream.read();
        }
    }
}
