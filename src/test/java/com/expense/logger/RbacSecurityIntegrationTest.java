package com.expense.logger;

import com.expense.logger.dto.UserLoginRequestDto;
import com.expense.logger.model.Role;
import com.expense.logger.model.User;
import com.expense.logger.repository.RefreshTokenRepository;
import com.expense.logger.repository.RoleRepository;
import com.expense.logger.repository.UserRepository;
import com.expense.logger.security.JwtTokenProvider;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.access.hierarchicalroles.RoleHierarchy;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.beans.factory.annotation.Qualifier;
import java.util.Map;

import java.util.Collection;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import static org.hamcrest.Matchers.hasItem;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
public class RbacSecurityIntegrationTest {

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
    private JwtTokenProvider tokenProvider;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private RoleHierarchy roleHierarchy;

    @Autowired
    private com.expense.logger.config.ApiRateLimitFilter rateLimitFilter;

    @Autowired
    @Qualifier("inMemoryRedis")
    private Map<String, String> inMemoryRedis;

    private User adminUser;
    private User normalUser;

    @BeforeEach
    public void setup() {
        rateLimitFilter.clearBuckets();
        if (inMemoryRedis != null) {
            inMemoryRedis.clear();
        }
        // Clear tokens and users to avoid constraint violations
        refreshTokenRepository.deleteAll();
        userRepository.deleteAll();

        // Retrieve seeded roles (created by RolePermissionInitializer)
        Role adminRole = roleRepository.findByName("ROLE_ADMIN")
                .orElseThrow(() -> new IllegalStateException("ROLE_ADMIN not seeded"));
        Role userRole = roleRepository.findByName("ROLE_USER")
                .orElseThrow(() -> new IllegalStateException("ROLE_USER not seeded"));

        // Create Admin User
        adminUser = User.builder()
                .username("admin_test")
                .email("admin_test@example.com")
                .firstName("Admin")
                .lastName("Test")
                .phoneNumber("+1111111111")
                .passwordHash(passwordEncoder.encode("adminpass"))
                .verified(true)
                .roles(new HashSet<>(Set.of(adminRole)))
                .build();
        userRepository.save(adminUser);

        // Create Normal User
        normalUser = User.builder()
                .username("user_test")
                .email("user_test@example.com")
                .firstName("User")
                .lastName("Test")
                .phoneNumber("+2222222222")
                .passwordHash(passwordEncoder.encode("userpass"))
                .verified(true)
                .roles(new HashSet<>(Set.of(userRole)))
                .build();
        userRepository.save(normalUser);
    }

    private String getAccessToken(String username, String password) throws Exception {
        UserLoginRequestDto loginDto = UserLoginRequestDto.builder()
                .usernameOrEmail(username)
                .password(password)
                .build();

        String response = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginDto)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        return objectMapper.readTree(response).get("accessToken").asText();
    }

    @Test
    public void testAdminEndpointForbiddenForRoleUser() throws Exception {
        // Log in as normal user
        String token = getAccessToken("user_test", "userpass");

        // Try to access get all users
        mockMvc.perform(get("/api/v1/users")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    @Test
    public void testAdminEndpointAllowedForRoleAdmin() throws Exception {
        // Log in as admin user
        String token = getAccessToken("admin_test", "adminpass");

        // Try to access get all users
        mockMvc.perform(get("/api/v1/users")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray());
    }

    @Test
    public void testJwtContainsRoles() throws Exception {
        // Log in as admin
        String token = getAccessToken("admin_test", "adminpass");

        // Extract and verify roles from token provider
        List<String> roles = tokenProvider.getRolesFromJwt(token);
        List<String> permissions = tokenProvider.getPermissionsFromJwt(token);

        assertTrue(roles.contains("ADMIN"), "JWT should contain ADMIN role");
        assertTrue(permissions.contains("write:user_management"), "JWT should contain write:user_management permission");
        assertTrue(permissions.contains("read:user_directories"), "JWT should contain read:user_directories permission");
    }

    @Test
    public void testRefreshTokenPreservesRoles() throws Exception {
        // Log in as admin to get cookies
        UserLoginRequestDto loginDto = UserLoginRequestDto.builder()
                .usernameOrEmail("admin_test")
                .password("adminpass")
                .build();

        MvcResult loginResult = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginDto)))
                .andExpect(status().isOk())
                .andReturn();

        Cookie refreshCookie = loginResult.getResponse().getCookie("refreshToken");
        assertTrue(refreshCookie != null, "Refresh token cookie should be present");

        // Perform token refresh
        MvcResult refreshResult = mockMvc.perform(post("/api/v1/auth/refresh")
                        .cookie(refreshCookie))
                .andExpect(status().isOk())
                .andReturn();

        String newAccessToken = objectMapper.readTree(refreshResult.getResponse().getContentAsString())
                .get("accessToken").asText();

        // Verify roles are still embedded in the new access token
        List<String> roles = tokenProvider.getRolesFromJwt(newAccessToken);
        assertTrue(roles.contains("ADMIN"), "Refreshed JWT should preserve ADMIN role");
    }

    @Test
    public void testRoleHierarchyInheritanceBehavior() {
        // Test ROLE_ADMIN inherits ROLE_AUDITOR and ROLE_USER
        Collection<? extends org.springframework.security.core.GrantedAuthority> adminReachable =
                roleHierarchy.getReachableGrantedAuthorities(List.of(new SimpleGrantedAuthority("ROLE_ADMIN")));

        Set<String> authorities = new HashSet<>();
        for (org.springframework.security.core.GrantedAuthority auth : adminReachable) {
            authorities.add(auth.getAuthority());
        }

        assertTrue(authorities.contains("ROLE_ADMIN"), "Admin reachable authorities should include ROLE_ADMIN");
        assertTrue(authorities.contains("ROLE_AUDITOR"), "Admin reachable authorities should include ROLE_AUDITOR");
        assertTrue(authorities.contains("ROLE_USER"), "Admin reachable authorities should include ROLE_USER");

        // Test ROLE_AUDITOR inherits ROLE_USER
        Collection<? extends org.springframework.security.core.GrantedAuthority> auditorReachable =
                roleHierarchy.getReachableGrantedAuthorities(List.of(new SimpleGrantedAuthority("ROLE_AUDITOR")));

        Set<String> auditorAuthorities = new HashSet<>();
        for (org.springframework.security.core.GrantedAuthority auth : auditorReachable) {
            auditorAuthorities.add(auth.getAuthority());
        }

        assertTrue(auditorAuthorities.contains("ROLE_AUDITOR"), "Auditor reachable authorities should include ROLE_AUDITOR");
        assertTrue(auditorAuthorities.contains("ROLE_USER"), "Auditor reachable authorities should include ROLE_USER");
        assertFalse(auditorAuthorities.contains("ROLE_ADMIN"), "Auditor reachable authorities should NOT include ROLE_ADMIN");
    }

    @Test
    public void testLogoutFlowClearsCookieAndInvalidatesSession() throws Exception {
        // 1. Log in as admin to get refresh cookie
        UserLoginRequestDto loginDto = UserLoginRequestDto.builder()
                .usernameOrEmail("admin_test")
                .password("adminpass")
                .build();

        MvcResult loginResult = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginDto)))
                .andExpect(status().isOk())
                .andReturn();

        Cookie refreshCookie = loginResult.getResponse().getCookie("refreshToken");
        assertTrue(refreshCookie != null, "Refresh token cookie should be present");
        assertTrue("/api/v1/auth".equals(refreshCookie.getPath()), "Refresh cookie path should be /api/v1/auth");

        // Verify it is present in DB
        long dbTokenCountBefore = refreshTokenRepository.count();
        assertTrue(dbTokenCountBefore > 0, "Refresh token should be persisted in DB");

        // 2. Verify Refresh Flow Still Works with the cookie
        MvcResult refreshResult = mockMvc.perform(post("/api/v1/auth/refresh")
                        .cookie(refreshCookie))
                .andExpect(status().isOk())
                .andReturn();

        Cookie rotatedCookie = refreshResult.getResponse().getCookie("refreshToken");
        assertTrue(rotatedCookie != null, "Rotated refresh token cookie should be present");
        assertTrue("/api/v1/auth".equals(rotatedCookie.getPath()), "Rotated cookie path should be /api/v1/auth");

        // 3. Perform Logout using the active refresh cookie
        MvcResult logoutResult = mockMvc.perform(post("/api/v1/auth/logout")
                        .cookie(rotatedCookie))
                .andExpect(status().isOk())
                .andReturn();

        // 4. Verify Cookie Clearing in logout response
        Cookie clearedCookie = logoutResult.getResponse().getCookie("refreshToken");
        assertTrue(clearedCookie != null, "Cleared refresh token cookie must be returned");
        assertTrue(clearedCookie.getValue() == null || clearedCookie.getValue().isEmpty() || "".equals(clearedCookie.getValue()), "Cleared cookie value should be empty");
        assertTrue("/api/v1/auth".equals(clearedCookie.getPath()), "Cleared cookie path should be /api/v1/auth");

        // 5. Verify Logout Invalidates Session in DB
        // Subsequent refresh attempts with the logged out/rotated token must fail
        mockMvc.perform(post("/api/v1/auth/refresh")
                        .cookie(rotatedCookie))
                .andExpect(status().isBadRequest());
    }

    @Test
    public void dumpDatabase() {
        System.out.println("=== DUMPING USERS ===");
        userRepository.findAll().forEach(u -> {
            System.out.println("User: " + u.getUsername() + ", Email: " + u.getEmail() + ", Verified: " + u.isVerified());
        });
        System.out.println("=== DUMPING REFRESH TOKENS ===");
        refreshTokenRepository.findAll().forEach(rt -> {
            System.out.println("Token Hash: " + rt.getTokenHash() + ", User: " + rt.getUser().getUsername() + ", Expires: " + rt.getExpiresAt() + ", Used: " + rt.isUsed());
        });
    }
}
