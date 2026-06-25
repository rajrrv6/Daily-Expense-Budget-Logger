package com.expense.logger.controller;

import com.expense.logger.dto.*;
import com.expense.logger.exception.ResourceNotFoundException;
import com.expense.logger.model.User;
import com.expense.logger.repository.UserRepository;
import com.expense.logger.service.AnalyticsService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/analytics")
public class AnalyticsController {

    private final AnalyticsService analyticsService;
    private final UserRepository userRepository;

    public AnalyticsController(AnalyticsService analyticsService, UserRepository userRepository) {
        this.analyticsService = analyticsService;
        this.userRepository = userRepository;
    }

    @GetMapping("/dashboard")
    public ResponseEntity<DashboardSummaryDto> getDashboardSummary(Authentication authentication) {
        UUID userId = getAuthenticatedUserId(authentication);
        return ResponseEntity.ok(analyticsService.getDashboardSummary(userId));
    }

    @GetMapping("/recent")
    public ResponseEntity<List<ExpenseResponseDto>> getRecentExpenses(
            Authentication authentication,
            @RequestParam(defaultValue = "5") int limit) {
        UUID userId = getAuthenticatedUserId(authentication);
        return ResponseEntity.ok(analyticsService.getRecentExpenses(userId, limit));
    }

    @GetMapping("/trends")
    public ResponseEntity<List<MonthlyTrendDto>> getMonthlyTrends(Authentication authentication) {
        UUID userId = getAuthenticatedUserId(authentication);
        return ResponseEntity.ok(analyticsService.getMonthlyTrends(userId));
    }

    @GetMapping("/categories/comparison")
    public ResponseEntity<List<CategoryComparisonDto>> getCategoryComparison(Authentication authentication) {
        UUID userId = getAuthenticatedUserId(authentication);
        return ResponseEntity.ok(analyticsService.getCategoryComparison(userId));
    }

    @GetMapping("/aggregate")
    public ResponseEntity<DateRangeAggregationDto> getRangeAggregation(
            Authentication authentication,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        UUID userId = getAuthenticatedUserId(authentication);
        return ResponseEntity.ok(analyticsService.getRangeAggregation(userId, startDate, endDate));
    }

    @GetMapping("/forecast")
    public ResponseEntity<BudgetForecastDto> getBudgetForecast(Authentication authentication) {
        UUID userId = getAuthenticatedUserId(authentication);
        return ResponseEntity.ok(analyticsService.getBudgetForecast(userId));
    }

    private UUID getAuthenticatedUserId(Authentication authentication) {
        User user = userRepository.findByUsernameAndDeletedAtIsNull(authentication.getName())
                .or(() -> userRepository.findByEmailAndDeletedAtIsNull(authentication.getName()))
                .orElseThrow(() -> new ResourceNotFoundException("User context not found"));
        return user.getId();
    }
}
