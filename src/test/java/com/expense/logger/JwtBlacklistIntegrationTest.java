package com.expense.logger;

import com.expense.logger.dto.UserLoginRequestDto;
import com.expense.logger.model.Role;
import com.expense.logger.model.User;
import com.expense.logger.repository.RefreshTokenRepository;
import com.expense.logger.repository.RoleRepository;
import com.expense.logger.repository.UserRepository;
import com.expense.logger.service.JwtBlacklistService;
import com.expense.logger.service.UserService;
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
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
public class JwtBlacklistIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private RefreshTokenRepository refreshTokenRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtBlacklistService blacklistService;

    @Autowired
    private UserService userService;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    @Qualifier("inMemoryRedis")
    private Map<String, String> inMemoryRedis;

    @Autowired
    private com.expense.logger.config.ApiRateLimitFilter rateLimitFilter;

    private User testUser;
    private User testAdmin;

    @BeforeEach
    public void setup() {
        rateLimitFilter.clearBuckets();
        if (inMemoryRedis != null) {
            inMemoryRedis.clear();
        }
        refreshTokenRepository.deleteAll();
        userRepository.deleteAll();

        // Retrieve pre-seeded roles from startup initializer
        Role userRole = roleRepository.findByName("ROLE_USER")
                .orElseThrow(() -> new IllegalStateException("ROLE_USER not seeded"));
        Role adminRole = roleRepository.findByName("ROLE_ADMIN")
                .orElseThrow(() -> new IllegalStateException("ROLE_ADMIN not seeded"));

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

        testAdmin = User.builder()
                .username("testadmin")
                .email("admin@example.com")
                .passwordHash(passwordEncoder.encode("Password123"))
                .firstName("Admin")
                .lastName("User")
                .verified(true)
                .roles(new HashSet<>(List.of(adminRole)))
                .build();
        userRepository.save(testAdmin);
    }

    @Test
    public void testLogoutRevocation() throws Exception {
        // 1. Login user
        UserLoginRequestDto loginDto = new UserLoginRequestDto();
        loginDto.setUsernameOrEmail("testuser");
        loginDto.setPassword("Password123");

        MvcResult loginResult = mockMvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(loginDto)))
                .andExpect(status().isOk())
                .andReturn();

        String responseBody = loginResult.getResponse().getContentAsString();
        Map<String, Object> responseMap = objectMapper.readValue(responseBody, Map.class);
        String accessToken = (String) responseMap.get("accessToken");
        assertNotNull(accessToken);

        // Verify we can access a protected API with this access token
        mockMvc.perform(get("/api/v1/todos")
                .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk());

        // 2. Perform logout to revoke/blacklist the access token
        mockMvc.perform(post("/api/v1/auth/logout")
                .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk());

        // 3. Attempt API reuse - should be blocked (401)
        mockMvc.perform(get("/api/v1/todos")
                .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isUnauthorized());
    }

    @Test
    public void testAdminLockRevocation() throws Exception {
        // 1. Login user
        UserLoginRequestDto loginDto = new UserLoginRequestDto();
        loginDto.setUsernameOrEmail("testuser");
        loginDto.setPassword("Password123");

        MvcResult loginResult = mockMvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(loginDto)))
                .andExpect(status().isOk())
                .andReturn();

        String responseBody = loginResult.getResponse().getContentAsString();
        Map<String, Object> responseMap = objectMapper.readValue(responseBody, Map.class);
        String accessToken = (String) responseMap.get("accessToken");
        assertNotNull(accessToken);

        // Verify access is allowed
        mockMvc.perform(get("/api/v1/todos")
                .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk());

        // 2. Admin locks the user account
        userService.toggleUserLock(testUser.getId(), testAdmin.getId());

        // 3. Verify user's JWT is immediately rejected
        mockMvc.perform(get("/api/v1/todos")
                .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isUnauthorized());
    }

    @Test
    public void testBlacklistedTokenDetection() throws Exception {
        // 1. Login user
        UserLoginRequestDto loginDto = new UserLoginRequestDto();
        loginDto.setUsernameOrEmail("testuser");
        loginDto.setPassword("Password123");

        MvcResult loginResult = mockMvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(loginDto)))
                .andExpect(status().isOk())
                .andReturn();

        String responseBody = loginResult.getResponse().getContentAsString();
        Map<String, Object> responseMap = objectMapper.readValue(responseBody, Map.class);
        String accessToken = (String) responseMap.get("accessToken");
        assertNotNull(accessToken);

        // 2. Manually blacklist the token
        blacklistService.blacklistToken(accessToken);

        // 3. Verify filter blocks access
        mockMvc.perform(get("/api/v1/todos")
                .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isUnauthorized());
    }
}
