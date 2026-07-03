package com.expense.logger;

import com.expense.logger.dto.TodoRequestDto;
import com.expense.logger.model.Category;
import com.expense.logger.model.Expense;
import com.expense.logger.model.TodoItem;
import com.expense.logger.model.User;
import com.expense.logger.repository.CategoryRepository;
import com.expense.logger.repository.ExpenseRepository;
import com.expense.logger.repository.TodoItemRepository;
import com.expense.logger.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import com.expense.logger.dto.ForgotPasswordRequestDto;
import com.expense.logger.dto.ResetPasswordRequestDto;
import com.expense.logger.dto.BudgetRequestDto;
import com.expense.logger.model.PasswordResetToken;
import com.expense.logger.model.Budget;
import com.expense.logger.repository.PasswordResetTokenRepository;
import com.expense.logger.repository.BudgetRepository;
import com.expense.logger.repository.RefreshTokenRepository;
import java.util.List;
import java.util.Map;
import com.expense.logger.service.LoginAttemptService;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
public class AdvancedFeaturesTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private ExpenseRepository expenseRepository;

    @Autowired
    private TodoItemRepository todoItemRepository;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private PasswordResetTokenRepository passwordResetTokenRepository;

    @Autowired
    private BudgetRepository budgetRepository;

    @Autowired
    private RefreshTokenRepository refreshTokenRepository;

    @Autowired
    private com.expense.logger.repository.NotificationRepository notificationRepository;

    @Autowired
    private com.expense.logger.repository.NotificationPreferencesRepository notificationPreferencesRepository;

    @Autowired
    private com.expense.logger.config.ApiRateLimitFilter rateLimitFilter;

    @Autowired
    private LoginAttemptService loginAttemptService;

    @Autowired
    @Qualifier("inMemoryRedis")
    private Map<String, String> inMemoryRedis;

    private User testUser;
    private User otherUser;
    private Category categoryFood;
    private Category categoryBills;

    @BeforeEach
    public void setup() {
        rateLimitFilter.clearBuckets();
        if (inMemoryRedis != null) {
            inMemoryRedis.clear();
        }
        // Clear repositories to ensure isolated test runs
        notificationRepository.deleteAll();
        notificationPreferencesRepository.deleteAll();
        expenseRepository.deleteAll();
        todoItemRepository.deleteAll();
        categoryRepository.deleteAll();
        userRepository.deleteAll();

        // Create Test Users
        testUser = User.builder()
                .username("testuser")
                .email("testuser@example.com")
                .firstName("Test")
                .lastName("User")
                .phoneNumber("+1234567890")
                .monthlyIncome(new BigDecimal("5000.00"))
                .passwordHash(passwordEncoder.encode("password"))
                .verified(true)
                .build();
        userRepository.save(testUser);

        otherUser = User.builder()
                .username("otheruser")
                .email("otheruser@example.com")
                .firstName("Other")
                .lastName("User")
                .phoneNumber("+0987654321")
                .monthlyIncome(new BigDecimal("4000.00"))
                .passwordHash(passwordEncoder.encode("password"))
                .verified(true)
                .build();
        userRepository.save(otherUser);

        // Create Categories
        categoryFood = Category.builder()
                .name("Food")
                .color("#FF0000")
                .build();
        categoryRepository.save(categoryFood);

        categoryBills = Category.builder()
                .name("Bills")
                .color("#0000FF")
                .build();
        categoryRepository.save(categoryBills);
    }

    @Test
    @WithMockUser(username = "testuser")
    public void testTodoCrudAndSecurity() throws Exception {
        // 1. Create Todo Item
        TodoRequestDto createDto = TodoRequestDto.builder()
                .name("Buy groceries")
                .build();

        String resultJson = mockMvc.perform(post("/api/v1/todos")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createDto)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id", notNullValue()))
                .andExpect(jsonPath("$.name", is("Buy groceries")))
                .andExpect(jsonPath("$.completed", is(false)))
                .andReturn().getResponse().getContentAsString();

        UUID todoId = UUID.fromString(objectMapper.readTree(resultJson).get("id").asText());

        // Verify it exists in repository and is owned by testUser
        assertTrue(todoItemRepository.findByIdAndUserIdAndDeletedAtIsNull(todoId, testUser.getId()).isPresent());

        // 2. Retrieve Todos (Filter = pending)
        mockMvc.perform(get("/api/v1/todos?completed=false"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].name", is("Buy groceries")));

        // 3. Toggle Completeness
        mockMvc.perform(patch("/api/v1/todos/" + todoId + "/toggle"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.completed", is(true)));

        // Retrieve Todos (Filter = completed)
        mockMvc.perform(get("/api/v1/todos?completed=true"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)));

        // Retrieve Todos (Filter = pending) -> should be empty now
        mockMvc.perform(get("/api/v1/todos?completed=false"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));

        // 4. Update Todo
        TodoRequestDto updateDto = TodoRequestDto.builder()
                .name("Buy organic groceries")
                .build();

        mockMvc.perform(put("/api/v1/todos/" + todoId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateDto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name", is("Buy organic groceries")));

        // 5. Cross-User Access Block Validation (otherUser tries to modify or delete testUser's todo)
        // We will run this by logging in as otheruser
    }

    @Test
    @WithMockUser(username = "otheruser")
    public void testCrossUserTodoAccessIsForbidden() throws Exception {
        // Create a todo item owned by testUser
        TodoItem item = TodoItem.builder()
                .name("Locked item")
                .completed(false)
                .user(testUser)
                .build();
        todoItemRepository.save(item);

        // Try to toggle or delete as otheruser -> expect 404 Resource Not Found
        mockMvc.perform(patch("/api/v1/todos/" + item.getId() + "/toggle"))
                .andExpect(status().isNotFound());

        mockMvc.perform(delete("/api/v1/todos/" + item.getId()))
                .andExpect(status().isNotFound());
    }

    @Test
    @WithMockUser(username = "testuser")
    public void testTodoSoftDelete() throws Exception {
        TodoItem item = TodoItem.builder()
                .name("Delete me")
                .completed(false)
                .user(testUser)
                .build();
        todoItemRepository.save(item);

        // Delete todo
        mockMvc.perform(delete("/api/v1/todos/" + item.getId()))
                .andExpect(status().isNoContent());

        // Verify soft-deleted
        TodoItem dbItem = todoItemRepository.findById(item.getId()).orElse(null);
        assertNotNull(dbItem);
        assertNotNull(dbItem.getDeletedAt());

        // Verify omitted from queries
        mockMvc.perform(get("/api/v1/todos"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));
    }

    @Test
    @WithMockUser(username = "testuser")
    public void testAnalyticsAndCalculations() throws Exception {
        LocalDate today = LocalDate.now();

        // Log Expenses for testUser
        Expense e1 = Expense.builder()
                .name("Lunch")
                .amount(new BigDecimal("15.50"))
                .transactionDate(today)
                .user(testUser)
                .category(categoryFood)
                .build();
        expenseRepository.save(e1);

        Expense e2 = Expense.builder()
                .name("Electric Bill")
                .amount(new BigDecimal("120.00"))
                .transactionDate(today.minusMonths(1)) // previous month
                .user(testUser)
                .category(categoryBills)
                .build();
        expenseRepository.save(e2);

        // Expense in current month to compare
        Expense e3 = Expense.builder()
                .name("Gas Bill")
                .amount(new BigDecimal("100.00"))
                .transactionDate(today) // current month
                .user(testUser)
                .category(categoryBills)
                .build();
        expenseRepository.save(e3);

        // Soft-deleted expense (should be ignored by all analytics)
        Expense deleted = Expense.builder()
                .name("Ignored expense")
                .amount(new BigDecimal("500.00"))
                .transactionDate(today)
                .user(testUser)
                .category(categoryFood)
                .deletedAt(LocalDateTime.now())
                .build();
        expenseRepository.save(deleted);

        // Expense belonging to otherUser (should be isolated/ignored)
        Expense otherExpense = Expense.builder()
                .name("Secret purchase")
                .amount(new BigDecimal("999.00"))
                .transactionDate(today)
                .user(otherUser)
                .category(categoryFood)
                .build();
        expenseRepository.save(otherExpense);

        // 1. Get Dashboard Summary
        mockMvc.perform(get("/api/v1/analytics/dashboard"))
                .andExpect(status().isOk())
                // Total current month should be e1 (15.50) + e3 (100.00) = 115.50
                .andExpect(jsonPath("$.totalExpensesMonth", is(115.50)))
                .andExpect(jsonPath("$.highestSpendingCategory", is("Bills")));

        // 2. Get Trends
        mockMvc.perform(get("/api/v1/analytics/trends"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2))) // current month and last month
                .andExpect(jsonPath("$[0].totalAmount", is(120.00)))
                .andExpect(jsonPath("$[1].totalAmount", is(115.50)));

        // 3. Get Category Comparison
        mockMvc.perform(get("/api/v1/analytics/categories/comparison"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2))) // Food and Bills (ignore soft deleted and other user)
                .andExpect(jsonPath("$[0].categoryName", is("Bills")))
                .andExpect(jsonPath("$[0].currentMonthAmount", is(100.00)))
                .andExpect(jsonPath("$[0].previousMonthAmount", is(120.00)))
                .andExpect(jsonPath("$[0].differenceAmount", is(-20.00)))
                .andExpect(jsonPath("$[1].categoryName", is("Food")))
                .andExpect(jsonPath("$[1].currentMonthAmount", is(15.50)))
                .andExpect(jsonPath("$[1].previousMonthAmount", is(0)))
                .andExpect(jsonPath("$[1].differenceAmount", is(15.50)));

        // 4. Get Date Range Aggregation
        mockMvc.perform(get("/api/v1/analytics/aggregate")
                        .param("startDate", today.minusDays(5).toString())
                        .param("endDate", today.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalSpent", is(115.50)));

        // Date validation: start date > end date
        mockMvc.perform(get("/api/v1/analytics/aggregate")
                        .param("startDate", today.toString())
                        .param("endDate", today.minusDays(1).toString()))
                .andExpect(status().isBadRequest());

        // Date validation: window > 366 days
        mockMvc.perform(get("/api/v1/analytics/aggregate")
                        .param("startDate", today.minusYears(2).toString())
                        .param("endDate", today.toString()))
                .andExpect(status().isBadRequest());

        // 5. Get Budget Forecast
        mockMvc.perform(get("/api/v1/analytics/forecast"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.forecastedAmount", is(120.00))) // only 1 completed history month has data (last month: 120.00)
                .andExpect(jsonPath("$.confidenceLevel", is("MEDIUM")));
    }

    @Test
    @WithMockUser(username = "testuser")
    public void testSecurePDFExport() throws Exception {
        LocalDate today = LocalDate.now();

        // Create standard expense
        Expense e1 = Expense.builder()
                .name("Normal expense")
                .amount(new BigDecimal("10.00"))
                .transactionDate(today)
                .user(testUser)
                .category(categoryFood)
                .build();
        expenseRepository.save(e1);

        // Create another expense
        Expense e2 = Expense.builder()
                .name("Other expense")
                .amount(new BigDecimal("20.00"))
                .transactionDate(today)
                .user(testUser)
                .category(categoryFood)
                .build();
        expenseRepository.save(e2);

        // Soft-deleted expense (should be excluded)
        Expense deleted = Expense.builder()
                .name("Deleted record")
                .amount(new BigDecimal("30.00"))
                .transactionDate(today)
                .user(testUser)
                .category(categoryFood)
                .deletedAt(LocalDateTime.now())
                .build();
        expenseRepository.save(deleted);

        // Trigger PDF Export
        byte[] pdfContent = mockMvc.perform(get("/api/v1/expenses/export"))
                .andExpect(status().isOk())
                .andExpect(content().contentType("application/pdf"))
                .andExpect(header().string("Content-Disposition", containsString("filename=\"expenses_export.pdf\"")))
                .andReturn().getResponse().getContentAsByteArray();

        // Verify PDF Magic Bytes Signature (%PDF)
        assertTrue(pdfContent.length > 4);
        assertEquals('%', (char) pdfContent[0]);
        assertEquals('P', (char) pdfContent[1]);
        assertEquals('D', (char) pdfContent[2]);
        assertEquals('F', (char) pdfContent[3]);
    }

    @Test
    public void testAccountLockoutFlow() throws Exception {
        // 1. Try to login with incorrect password 4 times sequentially
        com.expense.logger.dto.UserLoginRequestDto loginDto = com.expense.logger.dto.UserLoginRequestDto.builder()
                .usernameOrEmail("testuser")
                .password("wrongpassword")
                .build();

        for (int i = 1; i <= 4; i++) {
            mockMvc.perform(post("/api/v1/auth/login")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(loginDto)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.message", is("Invalid username or password")));
            
            // Verify failed login attempts counter increments in database
            User user = userRepository.findByUsernameAndDeletedAtIsNull("testuser").orElseThrow();
            assertEquals(i, user.getFailedLoginAttempts());
            assertNull(user.getLockoutUntil());
        }

        // 5th attempt - should trigger lockout for 15 minutes
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginDto)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("Account is locked due to multiple failed login attempts")));

        User userAfterLockout = userRepository.findByUsernameAndDeletedAtIsNull("testuser").orElseThrow();
        assertEquals(5, userAfterLockout.getFailedLoginAttempts());
        assertNotNull(userAfterLockout.getLockoutUntil());
        assertTrue(userAfterLockout.getLockoutUntil().isAfter(LocalDateTime.now()));

        // 6th attempt with CORRECT password - should still be blocked due to active lockout
        com.expense.logger.dto.UserLoginRequestDto correctLoginDto = com.expense.logger.dto.UserLoginRequestDto.builder()
                .usernameOrEmail("testuser")
                .password("password")
                .build();

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(correctLoginDto)))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.message", containsString("Rate limit exceeded. Account is locked. Please retry later.")));

        // 7. Reset failed login attempts and unlock user to verify successful login
        userAfterLockout.setLockoutUntil(null);
        userAfterLockout.setFailedLoginAttempts(3);
        userRepository.save(userAfterLockout);
        loginAttemptService.resetUserAttempts("testuser");
        loginAttemptService.resetUserAttempts("user@example.com");
        inMemoryRedis.remove("login:ip:127.0.0.1");
        rateLimitFilter.clearBuckets();

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(correctLoginDto)))
                .andExpect(status().isOk());

        User userAfterSuccess = userRepository.findByUsernameAndDeletedAtIsNull("testuser").orElseThrow();
        assertEquals(0, userAfterSuccess.getFailedLoginAttempts());
        assertNull(userAfterSuccess.getLockoutUntil());
    }

    @Test
    public void testForgotPasswordAndResetPasswordFlow() throws Exception {
        // 1. Forgot password request (generic success)
        ForgotPasswordRequestDto forgotDto = ForgotPasswordRequestDto.builder()
                .email("testuser@example.com")
                .build();
                 
        mockMvc.perform(post("/api/v1/auth/forgot-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(forgotDto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message", containsString("If the email matches an active account")));

        // Verify reset token was saved in database
        List<PasswordResetToken> tokens = passwordResetTokenRepository.findAllByUserAndUsedFalse(testUser);
        assertEquals(1, tokens.size());
        assertFalse(tokens.get(0).isUsed());
        assertNotNull(tokens.get(0).getExpiresAt());

        // 2. Generate a known token in database to test reset password
        String rawToken = "test-reset-token-123";
        String tokenHash = hashToken(rawToken);
         
        PasswordResetToken customToken = PasswordResetToken.builder()
                .user(testUser)
                .tokenHash(tokenHash)
                .expiresAt(LocalDateTime.now().plusMinutes(15))
                .used(false)
                .build();
        passwordResetTokenRepository.save(customToken);
         
        // Create an active refresh token to verify it gets deleted
        com.expense.logger.model.RefreshToken rt = com.expense.logger.model.RefreshToken.builder()
                .tokenHash("some-rt-hash")
                .familyId(UUID.randomUUID())
                .user(testUser)
                .expiresAt(LocalDateTime.now().plusDays(7))
                .used(false)
                .build();
        refreshTokenRepository.save(rt);

        // Reset password request
        ResetPasswordRequestDto resetDto = ResetPasswordRequestDto.builder()
                .token(rawToken)
                .newPassword("newsecurepassword")
                .build();
                 
        mockMvc.perform(post("/api/v1/auth/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(resetDto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message", containsString("Password has been reset successfully")));

        // Verify password was updated
        User updatedUser = userRepository.findById(testUser.getId()).orElseThrow();
        assertTrue(passwordEncoder.matches("newsecurepassword", updatedUser.getPasswordHash()));

        // Verify reset token is marked used
        PasswordResetToken checkedToken = passwordResetTokenRepository.findByTokenHash(tokenHash).orElseThrow();
        assertTrue(checkedToken.isUsed());
        assertNotNull(checkedToken.getUsedAt());

        // Verify refresh tokens are invalidated
        assertTrue(refreshTokenRepository.findAllByUser(testUser).isEmpty());

        // 3. Verify Token Reuse is Blocked
        mockMvc.perform(post("/api/v1/auth/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(resetDto)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("already been used")));
                 
        // 4. Verify Expired Token Reset is Blocked
        String expiredRawToken = "expired-token-123";
        String expiredTokenHash = hashToken(expiredRawToken);
        PasswordResetToken expiredToken = PasswordResetToken.builder()
                .user(testUser)
                .tokenHash(expiredTokenHash)
                .expiresAt(LocalDateTime.now().minusMinutes(5)) // expired 5m ago
                .used(false)
                .build();
        passwordResetTokenRepository.save(expiredToken);
         
        ResetPasswordRequestDto expiredResetDto = ResetPasswordRequestDto.builder()
                .token(expiredRawToken)
                .newPassword("anothernewpassword")
                .build();
                 
        mockMvc.perform(post("/api/v1/auth/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(expiredResetDto)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("has expired")));
    }

    @Test
    @WithMockUser(username = "testuser")
    public void testBudgetCrudAndOwnershipAndAnalytics() throws Exception {
        LocalDate today = LocalDate.now();
        budgetRepository.deleteAll();
        
        // 1. Create Budget
        BudgetRequestDto budgetRequest = BudgetRequestDto.builder()
                .categoryId(categoryFood.getId())
                .monthlyLimit(new BigDecimal("500.00"))
                .warningThresholdPercent(80)
                .startDate(today.withDayOfMonth(1))
                .endDate(today.withDayOfMonth(today.lengthOfMonth()))
                .build();
               
        String resultJson = mockMvc.perform(post("/api/v1/budgets")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(budgetRequest)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id", notNullValue()))
                .andExpect(jsonPath("$.monthlyLimit", is(500.00)))
                .andExpect(jsonPath("$.warningThresholdPercent", is(80)))
                .andExpect(jsonPath("$.categoryName", is("Food")))
                .andReturn().getResponse().getContentAsString();
               
        UUID budgetId = UUID.fromString(objectMapper.readTree(resultJson).get("id").asText());
       
        // Verify exists in repo
        assertTrue(budgetRepository.findByIdAndUserIdAndDeletedAtIsNull(budgetId, testUser.getId()).isPresent());
       
        // 2. Retrieve Budgets
        mockMvc.perform(get("/api/v1/budgets"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].id", is(budgetId.toString())));

        // 3. Update Budget
        BudgetRequestDto updateRequest = BudgetRequestDto.builder()
                .categoryId(categoryFood.getId())
                .monthlyLimit(new BigDecimal("600.00"))
                .warningThresholdPercent(90)
                .startDate(today.withDayOfMonth(1))
                .endDate(today.withDayOfMonth(today.lengthOfMonth()))
                .build();
               
        mockMvc.perform(put("/api/v1/budgets/" + budgetId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.monthlyLimit", is(600.00)))
                .andExpect(jsonPath("$.warningThresholdPercent", is(90)));

        // 4. Test Validation Rules
        // a) Monthly Limit <= 0
        BudgetRequestDto invalidRequest1 = BudgetRequestDto.builder()
                .categoryId(categoryFood.getId())
                .monthlyLimit(BigDecimal.ZERO)
                .warningThresholdPercent(80)
                .startDate(today)
                .endDate(today)
                .build();
        mockMvc.perform(post("/api/v1/budgets")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidRequest1)))
                .andExpect(status().isBadRequest());
               
        // b) Threshold out of bounds (105)
        BudgetRequestDto invalidRequest2 = BudgetRequestDto.builder()
                .categoryId(categoryFood.getId())
                .monthlyLimit(new BigDecimal("100.00"))
                .warningThresholdPercent(105)
                .startDate(today)
                .endDate(today)
                .build();
        mockMvc.perform(post("/api/v1/budgets")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidRequest2)))
                .andExpect(status().isBadRequest());

        // c) Start Date > End Date
        BudgetRequestDto invalidRequest3 = BudgetRequestDto.builder()
                .categoryId(categoryFood.getId())
                .monthlyLimit(new BigDecimal("100.00"))
                .warningThresholdPercent(80)
                .startDate(today.plusDays(1))
                .endDate(today)
                .build();
        mockMvc.perform(post("/api/v1/budgets")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidRequest3)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser(username = "otheruser")
    public void testCrossUserBudgetAccessIsForbidden() throws Exception {
        LocalDate today = LocalDate.now();
        Budget budget = Budget.builder()
                .user(testUser)
                .monthlyLimit(new BigDecimal("500.00"))
                .warningThresholdPercent(80)
                .startDate(today)
                .endDate(today)
                .build();
        budgetRepository.save(budget);

        // Try to update or delete testUser's budget as otheruser -> expect 404
        BudgetRequestDto updateRequest = BudgetRequestDto.builder()
                .monthlyLimit(new BigDecimal("600.00"))
                .warningThresholdPercent(90)
                .startDate(today)
                .endDate(today)
                .build();

        mockMvc.perform(put("/api/v1/budgets/" + budget.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateRequest)))
                .andExpect(status().isNotFound());

        mockMvc.perform(delete("/api/v1/budgets/" + budget.getId()))
                .andExpect(status().isNotFound());
    }

    @Test
    @WithMockUser(username = "testuser")
    public void testBudgetAnalyticsCalculation() throws Exception {
        LocalDate today = LocalDate.now();
        budgetRepository.deleteAll();
        expenseRepository.deleteAll();
        
        // Setup global budget of 400.00
        Budget budget = Budget.builder()
                .user(testUser)
                .monthlyLimit(new BigDecimal("400.00"))
                .warningThresholdPercent(80)
                .startDate(today.withDayOfMonth(1))
                .endDate(today.withDayOfMonth(today.lengthOfMonth()))
                .build();
        budgetRepository.save(budget);

        // Create expense of 350.00 (which is 87.5% of budget, triggering warning but not exceeding)
        Expense expense = Expense.builder()
                .name("Rent share")
                .amount(new BigDecimal("350.00"))
                .transactionDate(today)
                .user(testUser)
                .category(categoryFood)
                .build();
        expenseRepository.save(expense);

        // Fetch dashboard summary
        mockMvc.perform(get("/api/v1/analytics/dashboard"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.budgetLimit", is(400.00)))
                .andExpect(jsonPath("$.totalExpensesMonth", is(350.00)))
                .andExpect(jsonPath("$.remainingBudget", is(50.00)))
                .andExpect(jsonPath("$.budgetUtilizationPercent", is(87.50)))
                .andExpect(jsonPath("$.budgets", hasSize(1)))
                .andExpect(jsonPath("$.budgets[0].categoryName", is("Global")))
                .andExpect(jsonPath("$.budgets[0].warningTriggered", is(true)))
                .andExpect(jsonPath("$.budgets[0].exceeded", is(false)));
    }

    @Test
    @WithMockUser(username = "testuser")
    public void testUserProfileUpdateAndDuplicateValidation() throws Exception {
        // 1. Duplicate Validation (try to change email to otheruser's email)
        com.expense.logger.dto.UserProfileUpdateRequestDto duplicateDto = com.expense.logger.dto.UserProfileUpdateRequestDto.builder()
                .username("testuser")
                .email("otheruser@example.com")
                .firstName("Test")
                .lastName("User")
                .phoneNumber("+1234567890")
                .monthlyIncome(new BigDecimal("5000.00"))
                .build();

        mockMvc.perform(put("/api/v1/users/profile")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(duplicateDto)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("Email is already taken")));

        // 2. Update Profile successfully
        com.expense.logger.dto.UserProfileUpdateRequestDto updateDto = com.expense.logger.dto.UserProfileUpdateRequestDto.builder()
                .username("newtestuser")
                .email("newtestuser@example.com")
                .firstName("NewTest")
                .lastName("NewUser")
                .phoneNumber("+1999999999")
                .monthlyIncome(new BigDecimal("7500.00"))
                .build();

        mockMvc.perform(put("/api/v1/users/profile")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateDto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username", is("newtestuser")))
                .andExpect(jsonPath("$.email", is("newtestuser@example.com")))
                .andExpect(jsonPath("$.phoneNumber", is("+1999999999")))
                .andExpect(jsonPath("$.monthlyIncome", is(7500.00)));

        // Verify database state
        User updatedUser = userRepository.findById(testUser.getId()).orElseThrow();
        assertEquals("newtestuser", updatedUser.getUsername());
        assertEquals("newtestuser@example.com", updatedUser.getEmail());
        assertEquals("+1999999999", updatedUser.getPhoneNumber());
        assertEquals(0, new BigDecimal("7500.00").compareTo(updatedUser.getMonthlyIncome()));
    }

    @Test
    @WithMockUser(username = "testuser")
    public void testUserPasswordChangeFlow() throws Exception {
        // Create an active refresh token to verify it gets deleted
        com.expense.logger.model.RefreshToken rt = com.expense.logger.model.RefreshToken.builder()
                .tokenHash("user-rt-hash")
                .familyId(UUID.randomUUID())
                .user(testUser)
                .expiresAt(LocalDateTime.now().plusDays(7))
                .used(false)
                .build();
        refreshTokenRepository.save(rt);

        // 1. Invalid Current Password test
        com.expense.logger.dto.UserPasswordUpdateRequestDto badRequest = com.expense.logger.dto.UserPasswordUpdateRequestDto.builder()
                .currentPassword("wrongcurrentpassword")
                .newPassword("brandnewsecurepass")
                .build();

        mockMvc.perform(put("/api/v1/users/password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(badRequest)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("Invalid current password")));

        // 2. Valid Password update test
        com.expense.logger.dto.UserPasswordUpdateRequestDto goodRequest = com.expense.logger.dto.UserPasswordUpdateRequestDto.builder()
                .currentPassword("password") // Setup created it as password hash of "password"
                .newPassword("brandnewsecurepass")
                .build();

        mockMvc.perform(put("/api/v1/users/password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(goodRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message", containsString("Password changed successfully")));

        // Verify password hash in database matches new password
        User updatedUser = userRepository.findById(testUser.getId()).orElseThrow();
        assertTrue(passwordEncoder.matches("brandnewsecurepass", updatedUser.getPasswordHash()));

        // Verify active refresh tokens are invalidated
        assertTrue(refreshTokenRepository.findAllByUser(testUser).isEmpty());
    }

    @Test
    @WithMockUser(username = "testuser")
    public void testNotificationsAlertsAndPreferencesFlow() throws Exception {
        // 1. Verify GET /api/v1/notifications returns empty list first
        mockMvc.perform(get("/api/v1/notifications"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(0)));

        // Create notification preferences
        com.expense.logger.dto.NotificationPreferencesDto prefsDto = com.expense.logger.dto.NotificationPreferencesDto.builder()
                .budgetWarningsEnabled(true)
                .systemAlertsEnabled(true)
                .quietHoursEnabled(false)
                .build();

        mockMvc.perform(put("/api/v1/notifications/preferences")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(prefsDto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.budgetWarningsEnabled", is(true)));

        // Manually create some notifications in db to verify querying
        com.expense.logger.model.Notification n1 = com.expense.logger.model.Notification.builder()
                .user(testUser)
                .title("Test Alert 1")
                .message("This is a warning alert")
                .severity("WARNING")
                .category("BUDGET_WARNING")
                .read(false)
                .build();
        notificationRepository.save(n1);

        com.expense.logger.model.Notification n2 = com.expense.logger.model.Notification.builder()
                .user(testUser)
                .title("Test Alert 2")
                .message("This is a critical system alert")
                .severity("CRITICAL")
                .category("SYSTEM")
                .read(false)
                .build();
        notificationRepository.save(n2);

        // Verify unread count
        mockMvc.perform(get("/api/v1/notifications/unread-count"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.unreadCount", is(2)));

        // Query paginated list
        mockMvc.perform(get("/api/v1/notifications?page=0&size=10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(2)))
                .andExpect(jsonPath("$.totalElements", is(2)));

        // Mark single notification as read
        mockMvc.perform(put("/api/v1/notifications/" + n1.getId() + "/read"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.read", is(true)));

        // Verify unread count is now 1
        mockMvc.perform(get("/api/v1/notifications/unread-count"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.unreadCount", is(1)));

        // Mark all as read
        mockMvc.perform(put("/api/v1/notifications/read-all"))
                .andExpect(status().isOk());

        // Verify unread count is now 0
        mockMvc.perform(get("/api/v1/notifications/unread-count"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.unreadCount", is(0)));

        // Soft delete notification 1
        mockMvc.perform(delete("/api/v1/notifications/" + n1.getId()))
                .andExpect(status().isNoContent());

        // Verify notification 1 is omitted from query
        mockMvc.perform(get("/api/v1/notifications"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(1)))
                .andExpect(jsonPath("$.content[0].title", is("Test Alert 2")));
    }

    @Autowired
    private com.expense.logger.service.EmailService emailService;

    @Autowired
    private com.expense.logger.service.TokenCleanupScheduledTask tokenCleanupScheduledTask;

    @Test
    public void testAsyncEmailSendingAndRetryPool() throws Exception {
        long startTime = System.currentTimeMillis();
        // Invoke email sending (which will fail connection and retry in background task executor)
        emailService.sendEmail("test@example.com", "Test Subject", "Test Body");
        long duration = System.currentTimeMillis() - startTime;
        
        // Assert email returns immediately on main thread (< 150ms) showing it's offloaded asynchronously
        assertTrue(duration < 150, "Email execution should return immediately to avoid blocking client threads");
    }

    @Test
    public void testTokenCleanupScheduledTask() {
        passwordResetTokenRepository.deleteAll();
        refreshTokenRepository.deleteAll();
        
        PasswordResetToken expiredReset = PasswordResetToken.builder()
                .user(testUser)
                .tokenHash("expired-reset-hash")
                .expiresAt(LocalDateTime.now().minusMinutes(30))
                .build();
        passwordResetTokenRepository.save(expiredReset);
        
        PasswordResetToken activeReset = PasswordResetToken.builder()
                .user(testUser)
                .tokenHash("active-reset-hash")
                .expiresAt(LocalDateTime.now().plusMinutes(30))
                .build();
        passwordResetTokenRepository.save(activeReset);
        
        com.expense.logger.model.RefreshToken expiredRefresh = com.expense.logger.model.RefreshToken.builder()
                .user(testUser)
                .tokenHash("expired-refresh-hash")
                .familyId(UUID.randomUUID())
                .expiresAt(LocalDateTime.now().minusMinutes(30))
                .build();
        refreshTokenRepository.save(expiredRefresh);
        
        tokenCleanupScheduledTask.cleanupExpiredTokens();
        
        assertFalse(passwordResetTokenRepository.findByTokenHash("expired-reset-hash").isPresent());
        assertTrue(passwordResetTokenRepository.findByTokenHash("active-reset-hash").isPresent());
        assertFalse(refreshTokenRepository.findByTokenHash("expired-refresh-hash").isPresent());
    }

    private String hashToken(String token) {
        try {
            java.security.MessageDigest digest = java.security.MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(token.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    @Autowired
    private com.expense.logger.repository.VerificationOtpRepository verificationOtpRepository;

    @Autowired
    private com.expense.logger.repository.PendingRegistrationRepository pendingRegistrationRepository;

    @Test
    public void testOtpVerificationFlow() throws Exception {
        verificationOtpRepository.deleteAll();
        pendingRegistrationRepository.deleteAll();

        // 1. Register a new user
        com.expense.logger.dto.UserRegisterRequestDto registerDto = com.expense.logger.dto.UserRegisterRequestDto.builder()
                .username("otpuser")
                .email("otpuser@example.com")
                .firstName("Otp")
                .lastName("User")
                .phoneNumber("+1112223333")
                .password("SecurePass123!")
                .build();

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerDto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username", is("otpuser")))
                .andExpect(jsonPath("$.email", is("otpuser@example.com")))
                .andExpect(jsonPath("$.accessToken", nullValue()))
                .andExpect(jsonPath("$.refreshToken", nullValue()));

        // Verify user is NOT yet in main users database table
        assertFalse(userRepository.findByEmailAndDeletedAtIsNull("otpuser@example.com").isPresent());

        // Verify registration payload is in pending_registrations table
        List<com.expense.logger.model.PendingRegistration> pendings = pendingRegistrationRepository.findAll();
        assertEquals(1, pendings.size());
        com.expense.logger.model.PendingRegistration pending = pendings.get(0);
        assertEquals("otpuser@example.com", pending.getEmail());
        assertNotNull(pending.getOtpCode());
        String initialOtpCode = pending.getOtpCode();

        // 2. Attempt to login as otpuser (should fail because account does not exist/not verified)
        com.expense.logger.dto.UserLoginRequestDto loginDto = com.expense.logger.dto.UserLoginRequestDto.builder()
                .usernameOrEmail("otpuser")
                .password("SecurePass123!")
                .build();

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginDto)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("Invalid username or password")));

        // 3. Verify OTP using incorrect code
        com.expense.logger.dto.OtpVerificationRequestDto invalidVerifyDto = new com.expense.logger.dto.OtpVerificationRequestDto();
        invalidVerifyDto.setEmail("otpuser@example.com");
        invalidVerifyDto.setOtpCode("000000"); // wrong code

        mockMvc.perform(post("/api/v1/auth/verify-otp")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidVerifyDto)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message", containsString("Invalid OTP")));

        // Clear cooldown key in test Redis to allow immediate resend
        inMemoryRedis.remove("otp:cooldown:otpuser@example.com");

        // 4. Resend OTP code
        com.expense.logger.dto.OtpResendRequestDto resendDto = new com.expense.logger.dto.OtpResendRequestDto();
        resendDto.setEmail("otpuser@example.com");

        mockMvc.perform(post("/api/v1/auth/resend-otp")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(resendDto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message", containsString("A new verification code has been sent")));

        // Verify new OTP is generated
        List<com.expense.logger.model.PendingRegistration> allPendings = pendingRegistrationRepository.findAll();
        assertEquals(1, allPendings.size()); // should overwrite/update
        com.expense.logger.model.PendingRegistration updatedPending = allPendings.get(0);
        assertNotEquals(initialOtpCode, updatedPending.getOtpCode());

        // 5. Verify using the new correct OTP code
        com.expense.logger.dto.OtpVerificationRequestDto correctVerifyDto = new com.expense.logger.dto.OtpVerificationRequestDto();
        correctVerifyDto.setEmail("otpuser@example.com");
        correctVerifyDto.setOtpCode(updatedPending.getOtpCode());

        mockMvc.perform(post("/api/v1/auth/verify-otp")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(correctVerifyDto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken", notNullValue()))
                .andExpect(jsonPath("$.username", is("otpuser")));

        // Verify database user status is now verified = true in users table
        User verifiedUser = userRepository.findByEmailAndDeletedAtIsNull("otpuser@example.com").orElseThrow();
        assertTrue(verifiedUser.isVerified());

        // 6. Login now succeeds
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginDto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken", notNullValue()));
    }

    @Test
    public void testHardcodedTestOtpForUserExampleCom() throws Exception {
        pendingRegistrationRepository.deleteAll();

        // Register user@example.com
        com.expense.logger.dto.UserRegisterRequestDto registerDto = com.expense.logger.dto.UserRegisterRequestDto.builder()
                .username("user_test")
                .email("user@example.com")
                .firstName("Test")
                .lastName("User")
                .phoneNumber("+1112223333")
                .password("SecurePass123!")
                .build();

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerDto)))
                .andExpect(status().isOk());

        // Verify that the OTP saved is exactly "123456"
        com.expense.logger.model.PendingRegistration pending = pendingRegistrationRepository
                .findFirstByEmailOrderByCreatedAtDesc("user@example.com").orElseThrow();
        assertEquals("123456", pending.getOtpCode());

        // Verify OTP verification with "123456" succeeds
        com.expense.logger.dto.OtpVerificationRequestDto verifyDto = new com.expense.logger.dto.OtpVerificationRequestDto();
        verifyDto.setEmail("user@example.com");
        verifyDto.setOtpCode("123456");

        mockMvc.perform(post("/api/v1/auth/verify-otp")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(verifyDto)))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(username = "testuser")
    public void testPaymentReceiptUploadFlow() throws Exception {
        // 1. Upload a valid receipt file (PDF)
        org.springframework.mock.web.MockMultipartFile mockPdf = new org.springframework.mock.web.MockMultipartFile(
                "file",
                "receipt.pdf",
                "application/pdf",
                "dummy pdf content".getBytes()
        );

        String uploadResponse = mockMvc.perform(multipart("/api/v1/expenses/receipts")
                        .file(mockPdf))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.fileName", notNullValue()))
                .andReturn().getResponse().getContentAsString();

        String fileName = objectMapper.readTree(uploadResponse).get("fileName").asText();
        assertTrue(fileName.contains("receipt.pdf"));

        // 2. Upload a valid image (JPEG)
        org.springframework.mock.web.MockMultipartFile mockJpeg = new org.springframework.mock.web.MockMultipartFile(
                "file",
                "receipt.jpg",
                "image/jpeg",
                "dummy jpeg content".getBytes()
        );

        mockMvc.perform(multipart("/api/v1/expenses/receipts")
                        .file(mockJpeg))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.fileName", notNullValue()));

        // 3. Reject an invalid file format (TXT)
        org.springframework.mock.web.MockMultipartFile mockTxt = new org.springframework.mock.web.MockMultipartFile(
                "file",
                "receipt.txt",
                "text/plain",
                "dummy plain text content".getBytes()
        );

        mockMvc.perform(multipart("/api/v1/expenses/receipts")
                        .file(mockTxt))
                .andExpect(status().isBadRequest());

        // 4. Create an expense referencing the uploaded PDF
        com.expense.logger.dto.ExpenseRequestDto expenseDto = com.expense.logger.dto.ExpenseRequestDto.builder()
                .name("Dinner at Restaurant")
                .amount(new BigDecimal("150.50"))
                .transactionDate(LocalDate.now())
                .categoryId(categoryFood.getId())
                .receiptPath(fileName)
                .build();

        String expenseResponse = mockMvc.perform(post("/api/v1/expenses")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(expenseDto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", notNullValue()))
                .andExpect(jsonPath("$.receiptPath", is(fileName)))
                .andReturn().getResponse().getContentAsString();

        UUID expenseId = UUID.fromString(objectMapper.readTree(expenseResponse).get("id").asText());

        // 5. Download the uploaded receipt and verify content
        byte[] downloadedContent = mockMvc.perform(get("/api/v1/expenses/receipts/" + fileName))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Type", "application/pdf"))
                .andReturn().getResponse().getContentAsByteArray();

        assertArrayEquals("dummy pdf content".getBytes(), downloadedContent);

        // 6. Delete the expense and verify receipt file is deleted
        mockMvc.perform(delete("/api/v1/expenses/" + expenseId))
                .andExpect(status().isNoContent());

        // Attempting to download the receipt after deletion should return 404
        mockMvc.perform(get("/api/v1/expenses/receipts/" + fileName))
                .andExpect(status().isNotFound());
    }

    @Test
    @WithMockUser(username = "testuser")
    public void testChecklistExtendedFieldsAndValidation() throws Exception {
        LocalDate yesterday = LocalDate.now().minusDays(1);
        LocalDate today = LocalDate.now();

        // 1. Create with target date before today (yesterday) -> Expect 400 Bad Request
        TodoRequestDto badDateDto = TodoRequestDto.builder()
                .name("Buy bread")
                .targetDate(yesterday)
                .build();

        mockMvc.perform(post("/api/v1/todos")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(badDateDto)))
                .andExpect(status().isBadRequest());

        // 2. Create with negative price -> Expect 400 Bad Request
        TodoRequestDto badPriceDto = TodoRequestDto.builder()
                .name("Buy bread")
                .price(new BigDecimal("-5.00"))
                .build();

        mockMvc.perform(post("/api/v1/todos")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(badPriceDto)))
                .andExpect(status().isBadRequest());

        // 3. Create with today target date, valid price, and category -> Expect 201 Created
        TodoRequestDto goodDto = TodoRequestDto.builder()
                .name("Buy bread")
                .price(new BigDecimal("45.50"))
                .categoryId(categoryFood.getId())
                .targetDate(today)
                .build();

        mockMvc.perform(post("/api/v1/todos")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(goodDto)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name", is("Buy bread")))
                .andExpect(jsonPath("$.price", is(45.50)))
                .andExpect(jsonPath("$.categoryId", is(categoryFood.getId().intValue())))
                .andExpect(jsonPath("$.categoryName", is("Food")))
                .andExpect(jsonPath("$.targetDate", is(today.toString())));
    }

    @Test
    @WithMockUser(username = "testuser")
    public void testChecklistCompletionAndExpenseSync() throws Exception {
        // 1. Create checklist item
        TodoRequestDto createDto = TodoRequestDto.builder()
                .name("Office Desk")
                .price(new BigDecimal("1500.00"))
                .categoryId(categoryBills.getId())
                .build();

        String response = mockMvc.perform(post("/api/v1/todos")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createDto)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        UUID todoId = UUID.fromString(objectMapper.readTree(response).get("id").asText());

        // 2. Complete checklist item (change price & confirm)
        com.expense.logger.dto.TodoCompleteRequestDto completeDto = com.expense.logger.dto.TodoCompleteRequestDto.builder()
                .price(new BigDecimal("1450.00"))
                .categoryId(categoryBills.getId())
                .build();

        mockMvc.perform(patch("/api/v1/todos/" + todoId + "/complete")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(completeDto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.completed", is(true)))
                .andExpect(jsonPath("$.price", is(1450.00)));

        // 3. Verify that matching Expense was created automatically
        List<Expense> expenses = expenseRepository.findAllByUserIdAndDeletedAtIsNull(testUser.getId());
        // Should find 1 expense representing the completed shopping list item
        boolean expenseCreated = expenses.stream()
                .anyMatch(e -> e.getName().equals("Office Desk") && 
                               e.getAmount().compareTo(new BigDecimal("1450.00")) == 0 &&
                               e.getCategory().getId().equals(categoryBills.getId()));
        
        assertTrue(expenseCreated, "Matching expense should be logged automatically in the Expense Tracker");
    }
}

