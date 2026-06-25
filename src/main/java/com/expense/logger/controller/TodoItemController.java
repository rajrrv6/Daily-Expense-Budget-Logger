package com.expense.logger.controller;

import com.expense.logger.dto.TodoRequestDto;
import com.expense.logger.dto.TodoResponseDto;
import com.expense.logger.dto.TodoCompleteRequestDto;
import com.expense.logger.exception.ResourceNotFoundException;
import com.expense.logger.model.User;
import com.expense.logger.repository.UserRepository;
import com.expense.logger.service.TodoItemService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/todos")
public class TodoItemController {

    private final TodoItemService todoItemService;
    private final UserRepository userRepository;

    public TodoItemController(TodoItemService todoItemService, UserRepository userRepository) {
        this.todoItemService = todoItemService;
        this.userRepository = userRepository;
    }

    @GetMapping
    public ResponseEntity<List<TodoResponseDto>> getTodos(
            Authentication authentication,
            @RequestParam(required = false) Boolean completed) {
        UUID userId = getAuthenticatedUserId(authentication);
        return ResponseEntity.ok(todoItemService.getTodos(userId, completed));
    }

    @PostMapping
    public ResponseEntity<TodoResponseDto> createTodo(
            Authentication authentication,
            @Valid @RequestBody TodoRequestDto dto) {
        UUID userId = getAuthenticatedUserId(authentication);
        TodoResponseDto response = todoItemService.createTodo(dto, userId);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<TodoResponseDto> updateTodo(
            Authentication authentication,
            @PathVariable UUID id,
            @Valid @RequestBody TodoRequestDto dto) {
        UUID userId = getAuthenticatedUserId(authentication);
        return ResponseEntity.ok(todoItemService.updateTodo(id, dto, userId));
    }

    @PatchMapping("/{id}/toggle")
    public ResponseEntity<TodoResponseDto> toggleTodo(
            Authentication authentication,
            @PathVariable UUID id) {
        UUID userId = getAuthenticatedUserId(authentication);
        return ResponseEntity.ok(todoItemService.toggleTodo(id, userId));
    }

    @PatchMapping("/{id}/complete")
    public ResponseEntity<TodoResponseDto> completeTodo(
            Authentication authentication,
            @PathVariable UUID id,
            @Valid @RequestBody TodoCompleteRequestDto dto) {
        UUID userId = getAuthenticatedUserId(authentication);
        return ResponseEntity.ok(todoItemService.completeTodo(id, dto, userId));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTodo(
            Authentication authentication,
            @PathVariable UUID id) {
        UUID userId = getAuthenticatedUserId(authentication);
        todoItemService.deleteTodo(id, userId);
        return ResponseEntity.noContent().build();
    }

    private UUID getAuthenticatedUserId(Authentication authentication) {
        User user = userRepository.findByUsernameAndDeletedAtIsNull(authentication.getName())
                .or(() -> userRepository.findByEmailAndDeletedAtIsNull(authentication.getName()))
                .orElseThrow(() -> new ResourceNotFoundException("User context not found"));
        return user.getId();
    }
}
