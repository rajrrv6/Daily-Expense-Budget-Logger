package com.expense.logger.service;

import com.expense.logger.dto.TodoRequestDto;
import com.expense.logger.dto.TodoResponseDto;
import com.expense.logger.dto.TodoCompleteRequestDto;
import com.expense.logger.dto.ExpenseRequestDto;
import com.expense.logger.exception.ResourceNotFoundException;
import com.expense.logger.exception.BadRequestException;
import com.expense.logger.model.AuditLog;
import com.expense.logger.model.TodoItem;
import com.expense.logger.model.User;
import com.expense.logger.model.Category;
import com.expense.logger.repository.AuditLogRepository;
import com.expense.logger.repository.TodoItemRepository;
import com.expense.logger.repository.UserRepository;
import com.expense.logger.repository.CategoryRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Transactional
public class TodoItemServiceImpl implements TodoItemService {

    private final TodoItemRepository todoItemRepository;
    private final UserRepository userRepository;
    private final AuditLogRepository auditLogRepository;
    private final CategoryRepository categoryRepository;
    private final ExpenseService expenseService;

    public TodoItemServiceImpl(TodoItemRepository todoItemRepository,
            UserRepository userRepository,
            AuditLogRepository auditLogRepository,
            CategoryRepository categoryRepository,
            ExpenseService expenseService) {
        this.todoItemRepository = todoItemRepository;
        this.userRepository = userRepository;
        this.auditLogRepository = auditLogRepository;
        this.categoryRepository = categoryRepository;
        this.expenseService = expenseService;
    }

    @Override
    @Transactional(readOnly = true)
    public List<TodoResponseDto> getTodos(UUID userId, Boolean completed) {
        List<TodoItem> items;
        if (completed != null) {
            items = todoItemRepository.findAllByUserIdAndCompletedAndDeletedAtIsNull(userId, completed);
        } else {
            items = todoItemRepository.findAllByUserIdAndDeletedAtIsNull(userId);
        }
        return items.stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Override
    public TodoResponseDto createTodo(TodoRequestDto dto, UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (dto.getTargetDate() != null) {
            LocalDate today = LocalDate.now();
            if (dto.getTargetDate().isBefore(today)) {
                throw new BadRequestException("Target date cannot be in the past");
            }
        }

        if (dto.getPrice() != null && dto.getPrice().compareTo(java.math.BigDecimal.ZERO) < 0) {
            throw new BadRequestException("Price must be greater than or equal to zero");
        }

        Category category = null;
        if (dto.getCategoryId() != null) {
            category = categoryRepository.findById(dto.getCategoryId())
                    .orElseThrow(() -> new ResourceNotFoundException("Category not found"));
        }

        TodoItem item = TodoItem.builder()
                .name(dto.getName())
                .completed(false)
                .price(dto.getPrice())
                .category(category)
                .targetDate(dto.getTargetDate())
                .user(user)
                .build();

        todoItemRepository.save(item);

        logEvent("TODO_CREATE", "Todo item created: name=" + item.getName(), user);

        return mapToDto(item);
    }

    @Override
    public TodoResponseDto updateTodo(UUID id, TodoRequestDto dto, UUID userId) {
        TodoItem item = todoItemRepository.findByIdAndUserIdAndDeletedAtIsNull(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Todo item not found"));

        LocalDate oldTargetDate = item.getTargetDate();
        LocalDate newTargetDate = dto.getTargetDate();

        if (newTargetDate != null) {
            LocalDate today = LocalDate.now();
            if (newTargetDate.isBefore(today)) {
                throw new BadRequestException("Target date cannot be in the past");
            }
        }

        if (dto.getPrice() != null && dto.getPrice().compareTo(java.math.BigDecimal.ZERO) < 0) {
            throw new BadRequestException("Price must be greater than or equal to zero");
        }

        Category category = null;
        if (dto.getCategoryId() != null) {
            category = categoryRepository.findById(dto.getCategoryId())
                    .orElseThrow(() -> new ResourceNotFoundException("Category not found"));
        }

        item.setName(dto.getName());
        item.setPrice(dto.getPrice());
        item.setCategory(category);
        item.setTargetDate(newTargetDate);

        // Reset notification sent flag if target date changed
        if ((oldTargetDate == null && newTargetDate != null) ||
                (oldTargetDate != null && !oldTargetDate.equals(newTargetDate))) {
            item.setNotificationSent(false);
        }

        todoItemRepository.save(item);

        logEvent("TODO_UPDATE", "Todo item updated: id=" + item.getId() + ", name=" + item.getName(), item.getUser());

        return mapToDto(item);
    }

    @Override
    public TodoResponseDto toggleTodo(UUID id, UUID userId) {
        TodoItem item = todoItemRepository.findByIdAndUserIdAndDeletedAtIsNull(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Todo item not found"));

        item.setCompleted(!item.isCompleted());
        todoItemRepository.save(item);

        logEvent("TODO_TOGGLE", "Todo item toggled: id=" + item.getId() + ", completed=" + item.isCompleted(),
                item.getUser());

        return mapToDto(item);
    }

    @Override
    public TodoResponseDto completeTodo(UUID id, TodoCompleteRequestDto dto, UUID userId) {
        TodoItem item = todoItemRepository.findByIdAndUserIdAndDeletedAtIsNull(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Todo item not found"));

        if (item.isCompleted()) {
            throw new BadRequestException("Todo item is already completed");
        }

        Category category = categoryRepository.findById(dto.getCategoryId())
                .orElseThrow(() -> new ResourceNotFoundException("Category not found"));

        item.setCompleted(true);
        item.setPrice(dto.getPrice());
        item.setCategory(category);
        todoItemRepository.save(item);

        // Create the associated Expense
        ExpenseRequestDto expenseRequest = ExpenseRequestDto.builder()
                .name(item.getName())
                .amount(dto.getPrice())
                .transactionDate(LocalDate.now())
                .categoryId(dto.getCategoryId())
                .receiptPath(dto.getReceiptPath())
                .build();
        expenseService.createExpense(expenseRequest, userId);

        logEvent("TODO_COMPLETE",
                "Todo item completed and logged as expense: id=" + item.getId() + ", name=" + item.getName(),
                item.getUser());

        return mapToDto(item);
    }

    @Override
    public void deleteTodo(UUID id, UUID userId) {
        TodoItem item = todoItemRepository.findByIdAndUserIdAndDeletedAtIsNull(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Todo item not found"));

        item.setDeletedAt(LocalDateTime.now());
        todoItemRepository.save(item);

        logEvent("TODO_DELETE", "Todo item soft-deleted: id=" + item.getId(), item.getUser());
    }

    private void logEvent(String actionType, String description, User user) {
        AuditLog auditLog = AuditLog.builder()
                .actionType(actionType)
                .description(description)
                .user(user)
                .build();
        auditLogRepository.save(auditLog);
    }

    private TodoResponseDto mapToDto(TodoItem item) {
        TodoResponseDto.TodoResponseDtoBuilder builder = TodoResponseDto.builder()
                .id(item.getId())
                .name(item.getName())
                .completed(item.isCompleted())
                .price(item.getPrice())
                .targetDate(item.getTargetDate())
                .createdAt(item.getCreatedAt())
                .updatedAt(item.getUpdatedAt());

        if (item.getCategory() != null) {
            builder.categoryId(item.getCategory().getId())
                    .categoryName(item.getCategory().getName())
                    .categoryColor(item.getCategory().getColor());
        }

        return builder.build();
    }
}
