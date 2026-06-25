package com.expense.logger.service;

import com.expense.logger.dto.CategoryRequestDto;
import com.expense.logger.dto.CategoryResponseDto;
import com.expense.logger.exception.BadRequestException;
import com.expense.logger.model.AuditLog;
import com.expense.logger.model.Category;
import com.expense.logger.model.User;
import com.expense.logger.repository.AuditLogRepository;
import com.expense.logger.repository.CategoryRepository;
import com.expense.logger.repository.UserRepository;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class CategoryServiceImpl implements CategoryService {

    private final CategoryRepository categoryRepository;
    private final UserRepository userRepository;
    private final AuditLogRepository auditLogRepository;

    public CategoryServiceImpl(CategoryRepository categoryRepository,
                               UserRepository userRepository,
                               AuditLogRepository auditLogRepository) {
        this.categoryRepository = categoryRepository;
        this.userRepository = userRepository;
        this.auditLogRepository = auditLogRepository;
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

    private CategoryResponseDto mapToDto(Category category) {
        return CategoryResponseDto.builder()
                .id(category.getId())
                .name(category.getName())
                .color(category.getColor())
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
