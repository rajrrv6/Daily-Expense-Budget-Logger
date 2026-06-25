package com.expense.logger.repository;

import com.expense.logger.model.TodoItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TodoItemRepository extends JpaRepository<TodoItem, UUID> {
    List<TodoItem> findAllByUserIdAndDeletedAtIsNull(UUID userId);
    List<TodoItem> findAllByUserIdAndCompletedAndDeletedAtIsNull(UUID userId, boolean completed);
    Optional<TodoItem> findByIdAndUserIdAndDeletedAtIsNull(UUID id, UUID userId);
}
