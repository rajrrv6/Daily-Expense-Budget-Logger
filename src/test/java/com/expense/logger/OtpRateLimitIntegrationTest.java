package com.expense.logger;

import com.expense.logger.dto.OtpResendRequestDto;
import com.expense.logger.dto.OtpVerificationRequestDto;
import com.expense.logger.model.Role;
import com.expense.logger.model.User;
import com.expense.logger.repository.PendingRegistrationRepository;
import com.expense.logger.repository.RefreshTokenRepository;
import com.expense.logger.repository.RoleRepository;
import com.expense.logger.repository.UserRepository;
import com.expense.logger.service.OtpAttemptTrackerService;
import com.expense.logger.service.OtpRateLimitService;
import com.expense.logger.model.PendingRegistration;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
public class OtpRateLimitIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private RefreshTokenRepository refreshTokenRepository;

    @Autowired
    private PendingRegistrationRepository pendingRegistrationRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private OtpAttemptTrackerService attemptTrackerService;

    @Autowired
    private OtpRateLimitService rateLimitService;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    @Qualifier("inMemoryRedis")
    private Map<String, String> inMemoryRedis;

    @Autowired
    private com.expense.logger.config.ApiRateLimitFilter rateLimitFilter;

    private User testUser;

    @BeforeEach
    public void setup() {
        rateLimitFilter.clearBuckets();
        if (inMemoryRedis != null) {
            inMemoryRedis.clear();
        }
        refreshTokenRepository.deleteAll();
        userRepository.deleteAll();
        pendingRegistrationRepository.deleteAll();

        Role userRole = roleRepository.findByName("ROLE_USER")
                .orElseThrow(() -> new IllegalStateException("ROLE_USER not seeded"));

        testUser = User.builder()
                .username("testuser")
                .email("user@example.com")
                .passwordHash(passwordEncoder.encode("Password123"))
                .firstName("Test")
                .lastName("User")
                .verified(true)
                .roles(new HashSet<>(List.of(userRole)))
                .build();
        userRepository.save(testUser);
    }

    @Test
    public void testOtpSendCooldownAndRateLimit() throws Exception {
        // 1. Create a pending registration first
        PendingRegistration pending = PendingRegistration.builder()
                .email("testsend@example.com")
                .username("testsend")
                .passwordHash("hash")
                .otpCode("123456")
                .expiresAt(LocalDateTime.now().plusMinutes(15))
                .build();
        pendingRegistrationRepository.save(pending);

        OtpResendRequestDto resendDto = new OtpResendRequestDto();
        resendDto.setEmail("testsend@example.com");

        // First OTP send should succeed
        mockMvc.perform(post("/api/v1/auth/resend-otp")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(resendDto)))
                .andExpect(status().isOk());

        // Second OTP send should trigger cooldown block (429)
        mockMvc.perform(post("/api/v1/auth/resend-otp")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(resendDto)))
                .andExpect(status().isTooManyRequests());
    }

    @Test
    public void testOtpVerificationAttemptsLockout() throws Exception {
        // 1. Create a pending registration
        PendingRegistration pending = PendingRegistration.builder()
                .email("testverify@example.com")
                .username("testverify")
                .passwordHash("hash")
                .otpCode("123456")
                .expiresAt(LocalDateTime.now().plusMinutes(15))
                .build();
        pendingRegistrationRepository.save(pending);

        OtpVerificationRequestDto verifyDto = new OtpVerificationRequestDto();
        verifyDto.setEmail("testverify@example.com");
        verifyDto.setOtpCode("999999"); // Wrong code

        // Perform 5 failed attempts
        for (int i = 0; i < 5; i++) {
            mockMvc.perform(post("/api/v1/auth/verify-otp")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(verifyDto)))
                    .andExpect(status().isUnauthorized());
        }

        // The 6th attempt should be blocked with 403 Forbidden due to lockout
        mockMvc.perform(post("/api/v1/auth/verify-otp")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(verifyDto)))
                .andExpect(status().isForbidden());
    }

    @Test
    public void testSuccessfulVerificationResetsAttempts() throws Exception {
        PendingRegistration pending = PendingRegistration.builder()
                .email("testsuccess@example.com")
                .username("testsuccess")
                .passwordHash("hash")
                .otpCode("123456")
                .expiresAt(LocalDateTime.now().plusMinutes(15))
                .build();
        pendingRegistrationRepository.save(pending);

        OtpVerificationRequestDto verifyDto = new OtpVerificationRequestDto();
        verifyDto.setEmail("testsuccess@example.com");

        // 1. Record 3 failed attempts
        verifyDto.setOtpCode("999999");
        for (int i = 0; i < 3; i++) {
            mockMvc.perform(post("/api/v1/auth/verify-otp")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(verifyDto)))
                    .andExpect(status().isUnauthorized());
        }

        assertEquals(3, attemptTrackerService.getFailedAttempts("testsuccess@example.com"));

        // 2. Perform a successful verification
        verifyDto.setOtpCode("123456");
        mockMvc.perform(post("/api/v1/auth/verify-otp")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(verifyDto)))
                .andExpect(status().isOk());

        // 3. Verify failed attempts counter is reset to 0
        assertEquals(0, attemptTrackerService.getFailedAttempts("testsuccess@example.com"));
    }
}
