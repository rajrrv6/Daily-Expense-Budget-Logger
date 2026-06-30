package com.expense.logger.service;

import com.expense.logger.dto.CategoryRequestDto;
import com.expense.logger.dto.CategoryResponseDto;
import com.expense.logger.dto.CategoryDetailsDto;
import com.expense.logger.dto.ExpenseResponseDto;
import com.expense.logger.exception.BadRequestException;
import com.expense.logger.exception.ResourceNotFoundException;
import com.expense.logger.model.AuditLog;
import com.expense.logger.model.Category;
import com.expense.logger.model.Expense;
import com.expense.logger.model.Budget;
import com.expense.logger.model.User;
import com.expense.logger.repository.AuditLogRepository;
import com.expense.logger.repository.CategoryRepository;
import com.expense.logger.repository.UserRepository;
import com.expense.logger.repository.BudgetRepository;
import com.expense.logger.repository.ExpenseRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Transactional
public class CategoryServiceImpl implements CategoryService {

    private final CategoryRepository categoryRepository;
    private final UserRepository userRepository;
    private final AuditLogRepository auditLogRepository;
    private final BudgetRepository budgetRepository;
    private final ExpenseRepository expenseRepository;

    public CategoryServiceImpl(CategoryRepository categoryRepository,
                               UserRepository userRepository,
                               AuditLogRepository auditLogRepository,
                               BudgetRepository budgetRepository,
                               ExpenseRepository expenseRepository) {
        this.categoryRepository = categoryRepository;
        this.userRepository = userRepository;
        this.auditLogRepository = auditLogRepository;
        this.budgetRepository = budgetRepository;
        this.expenseRepository = expenseRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public List<CategoryResponseDto> getAllCategories() {
        return categoryRepository.findAllByDeletedAtIsNull().stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Override
    public CategoryResponseDto createCategory(CategoryRequestDto dto) {
        if (categoryRepository.existsByNameAndDeletedAtIsNull(dto.getName())) {
            throw new BadRequestException("Category name already exists");
        }

        Category category = Category.builder()
                .name(dto.getName())
                .color(dto.getColor())
                .build();

        categoryRepository.save(category);

        // Audit log key creation event
        User currentUser = getCurrentUser();
        if (currentUser != null) {
            AuditLog auditLog = AuditLog.builder()
                    .actionType("CATEGORY_CREATE")
                    .description("Category created: name=" + category.getName())
                    .user(currentUser)
                    .build();
            auditLogRepository.save(auditLog);
        }

        return mapToDto(category);
    }

    @Override
    public CategoryResponseDto updateCategory(Long id, CategoryRequestDto dto) {
        Category category = categoryRepository.findById(id)
                .filter(c -> c.getDeletedAt() == null)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found"));

        if (categoryRepository.existsByNameAndIdNotAndDeletedAtIsNull(dto.getName(), id)) {
            throw new BadRequestException("Category name already exists");
        }

        category.setName(dto.getName());
        category.setColor(dto.getColor());
        categoryRepository.save(category);

        User currentUser = getCurrentUser();
        if (currentUser != null) {
            AuditLog auditLog = AuditLog.builder()
                    .actionType("CATEGORY_UPDATE")
                    .description("Category updated: id=" + id + ", name=" + category.getName())
                    .user(currentUser)
                    .build();
            auditLogRepository.save(auditLog);
        }

        return mapToDto(category);
    }

    @Override
    public void deleteCategory(Long id) {
        Category category = categoryRepository.findById(id)
                .filter(c -> c.getDeletedAt() == null)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found"));

        category.setDeletedAt(LocalDateTime.now());
        categoryRepository.save(category);

        User currentUser = getCurrentUser();
        if (currentUser != null) {
            AuditLog auditLog = AuditLog.builder()
                    .actionType("CATEGORY_DELETE")
                    .description("Category soft-deleted: id=" + id)
                    .user(currentUser)
                    .build();
            auditLogRepository.save(auditLog);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public CategoryDetailsDto getCategoryDetails(Long id, UUID userId) {
        Category category = categoryRepository.findById(id)
                .filter(c -> c.getDeletedAt() == null)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found"));

        // Budget allocation
        List<Budget> budgets = budgetRepository.findAllByUserIdAndCategoryIdAndDeletedAtIsNull(userId, id);
        BigDecimal budgetLimit = budgets.stream()
                .map(Budget::getMonthlyLimit)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Expense count
        long expenseCount = expenseRepository.countByUserIdAndCategoryIdAndDeletedAtIsNull(userId, id);

        // Recent expenses
        List<ExpenseResponseDto> recentExpenses = expenseRepository
                .findAllByUserIdAndCategoryIdAndDeletedAtIsNull(
                        userId, id, PageRequest.of(0, 5, Sort.by(Sort.Direction.DESC, "transactionDate")))
                .getContent().stream()
                .map(this::mapExpenseToDto)
                .collect(Collectors.toList());

        return CategoryDetailsDto.builder()
                .id(category.getId())
                .name(category.getName())
                .color(category.getColor())
                .createdAt(category.getCreatedAt())
                .budgetLimit(budgetLimit)
                .expenseCount(expenseCount)
                .recentExpenses(recentExpenses)
                .build();
    }

    private CategoryResponseDto mapToDto(Category category) {
        return CategoryResponseDto.builder()
                .id(category.getId())
                .name(category.getName())
                .color(category.getColor())
                .createdAt(category.getCreatedAt())
                .build();
    }

    private ExpenseResponseDto mapExpenseToDto(Expense expense) {
        return ExpenseResponseDto.builder()
                .id(expense.getId())
                .name(expense.getName())
                .amount(expense.getAmount())
                .transactionDate(expense.getTransactionDate())
                .category(mapToDto(expense.getCategory()))
                .receiptPath(expense.getReceiptPath())
                .createdAt(expense.getCreatedAt())
                .updatedAt(expense.getUpdatedAt())
                .build();
    }

    private User getCurrentUser() {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        if (principal instanceof UserDetails) {
            String username = ((UserDetails) principal).getUsername();
            return userRepository.findByUsernameAndDeletedAtIsNull(username)
                    .or(() -> userRepository.findByEmailAndDeletedAtIsNull(username))
                    .orElse(null);
        }
        return null;
    }
}
