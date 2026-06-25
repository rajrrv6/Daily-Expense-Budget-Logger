package com.expense.logger.service;

import com.expense.logger.dto.TodoRequestDto;
import com.expense.logger.dto.TodoResponseDto;
import com.expense.logger.dto.TodoCompleteRequestDto;

import java.util.List;
import java.util.UUID;

public interface TodoItemService {
    List<TodoResponseDto> getTodos(UUID userId, Boolean completed);
    TodoResponseDto createTodo(TodoRequestDto dto, UUID userId);
    TodoResponseDto updateTodo(UUID id, TodoRequestDto dto, UUID userId);
    TodoResponseDto toggleTodo(UUID id, UUID userId);
    TodoResponseDto completeTodo(UUID id, TodoCompleteRequestDto dto, UUID userId);
    void deleteTodo(UUID id, UUID userId);
}
