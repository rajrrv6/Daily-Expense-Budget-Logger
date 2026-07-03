package com.expense.logger;

import com.expense.logger.dto.UserLoginRequestDto;
import com.expense.logger.model.Role;
import com.expense.logger.model.User;
import com.expense.logger.repository.RoleRepository;
import com.expense.logger.repository.UserRepository;
import com.expense.logger.service.LoginAttemptService;
import com.expense.logger.config.ApiRateLimitFilter;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.SpyBean;
import org.springframework.data.redis.RedisSystemException;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.util.HashSet;
import java.util.List;
import java.util.Map;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
public class ApiRateLimitIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private ApiRateLimitFilter rateLimitFilter;

    @Autowired
    @Qualifier("inMemoryRedis")
    private Map<String, String> inMemoryRedis;

    @Autowired
    private RedisTemplate<String, String> redisTemplate;

    @SpyBean
    private LoginAttemptService loginAttemptService;

    private User testUser;

    @BeforeEach
    public void setup() {
        rateLimitFilter.clearBuckets();
        if (inMemoryRedis != null) {
            inMemoryRedis.clear();
        }
        userRepository.deleteAll();

        Role userRole = roleRepository.findByName("ROLE_USER")
                .orElseThrow(() -> new IllegalStateException("ROLE_USER not seeded"));

        testUser = User.builder()
                .username("ratelimituser")
                .email("ratelimituser@example.com")
                .passwordHash(passwordEncoder.encode("Password123"))
                .firstName("Rate")
                .lastName("Limit")
                .verified(true)
                .roles(new HashSet<>(List.of(userRole)))
                .build();
        userRepository.save(testUser);
    }

    @Test
    public void testIpLoginRateLimiting() throws Exception {
        UserLoginRequestDto loginDto = UserLoginRequestDto.builder()
                .usernameOrEmail("ratelimituser")
                .password("Password123")
                .build();

        // 1. Perform 5 login requests (capacity is 5)
        for (int i = 0; i < 5; i++) {
            mockMvc.perform(post("/api/v1/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(loginDto)))
                    .andExpect(status().isOk());
        }

        // 2. The 6th attempt should be blocked with 429 Too Many Requests
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginDto)))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.message", containsString("Rate limit exceeded")));
    }

    @Test
    public void testUserLoginLockout() throws Exception {
        UserLoginRequestDto loginDto = UserLoginRequestDto.builder()
                .usernameOrEmail("ratelimituser")
                .password("WrongPassword")
                .build();

        // 1. Perform 5 failed login attempts
        for (int i = 0; i < 5; i++) {
            mockMvc.perform(post("/api/v1/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(loginDto)))
                    .andExpect(status().isBadRequest());
        }

        // 2. Subsequent attempt (even with correct password) should be locked out with 429
        UserLoginRequestDto correctLoginDto = UserLoginRequestDto.builder()
                .usernameOrEmail("ratelimituser")
                .password("Password123")
                .build();

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(correctLoginDto)))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.message", containsString("Rate limit exceeded. Account is locked. Please retry later.")));
    }

    @Test
    public void testFailSecureRedisOffline() throws Exception {
        UserLoginRequestDto loginDto = UserLoginRequestDto.builder()
                .usernameOrEmail("ratelimituser")
                .password("Password123")
                .build();

        // Mock loginAttemptService to throw RedisSystemException simulating Redis outage
        Mockito.doThrow(new RedisSystemException("Redis Connection Refused", new IOException()))
                .when(loginAttemptService).isUserBlocked(Mockito.anyString());

        // Perform login and verify fail-secure response (503 Service Unavailable)
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginDto)))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.message", containsString("Security enforcement rate-limit block: Centralized cache layer is offline.")));
    }
}
