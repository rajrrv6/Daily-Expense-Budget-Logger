package com.expense.logger.service;

import com.expense.logger.dto.TodoRequestDto;
import com.expense.logger.dto.TodoResponseDto;
import com.expense.logger.exception.ResourceNotFoundException;
import com.expense.logger.model.AuditLog;
import com.expense.logger.model.TodoItem;
import com.expense.logger.model.User;
import com.expense.logger.repository.AuditLogRepository;
import com.expense.logger.repository.TodoItemRepository;
import com.expense.logger.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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

    public TodoItemServiceImpl(TodoItemRepository todoItemRepository,
                               UserRepository userRepository,
                               AuditLogRepository auditLogRepository) {
        this.todoItemRepository = todoItemRepository;
        this.userRepository = userRepository;
        this.auditLogRepository = auditLogRepository;
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

        TodoItem item = TodoItem.builder()
                .name(dto.getName())
                .completed(false)
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

        item.setName(dto.getName());
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

        logEvent("TODO_TOGGLE", "Todo item toggled: id=" + item.getId() + ", completed=" + item.isCompleted(), item.getUser());

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
        return TodoResponseDto.builder()
                .id(item.getId())
                .name(item.getName())
                .completed(item.isCompleted())
                .createdAt(item.getCreatedAt())
                .updatedAt(item.getUpdatedAt())
                .build();
    }
}
