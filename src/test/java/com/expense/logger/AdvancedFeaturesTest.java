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

    private User testUser;
    private User otherUser;
    private Category categoryFood;
    private Category categoryBills;

    @BeforeEach
    public void setup() {
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
                .passwordHash(passwordEncoder.encode("password"))
                .build();
        userRepository.save(testUser);

        otherUser = User.builder()
                .username("otheruser")
                .email("otheruser@example.com")
                .passwordHash(passwordEncoder.encode("password"))
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
    public void testSecureCSVExport() throws Exception {
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

        // Create dangerous expense to test CSV Injection Sanitization
        Expense e2 = Expense.builder()
                .name("=1+1")
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

        // Trigger CSV Export
        String csvContent = mockMvc.perform(get("/api/v1/expenses/export"))
                .andExpect(status().isOk())
                .andExpect(content().contentType("text/csv; charset=UTF-8"))
                .andExpect(header().string("Content-Disposition", containsString("filename=\"expenses_export.csv\"")))
                .andReturn().getResponse().getContentAsString();

        // 1. Verify BOM prefix presence (\uFEFF)
        assertTrue(csvContent.startsWith("\uFEFF"));

        // 2. Verify headers are correct
        assertTrue(csvContent.contains("Expense ID,Name,Amount,Category,Transaction Date,Created At"));

        // 3. Verify normal expense exists
        assertTrue(csvContent.contains("Normal expense"));

        // 4. Verify CSV injection protection escaping (name starts with '=' should have prepended single quote)
        assertTrue(csvContent.contains("'=1+1"));

        // 5. Verify soft-deleted expense is excluded
        assertFalse(csvContent.contains("Deleted record"));
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
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("Account is locked due to multiple failed login attempts")));

        // 7. Reset failed login attempts and unlock user to verify successful login
        userAfterLockout.setLockoutUntil(null);
        userAfterLockout.setFailedLoginAttempts(3);
        userRepository.save(userAfterLockout);

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
                .build();

        mockMvc.perform(put("/api/v1/users/profile")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateDto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username", is("newtestuser")))
                .andExpect(jsonPath("$.email", is("newtestuser@example.com")));

        // Verify database state
        User updatedUser = userRepository.findById(testUser.getId()).orElseThrow();
        assertEquals("newtestuser", updatedUser.getUsername());
        assertEquals("newtestuser@example.com", updatedUser.getEmail());
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
}
