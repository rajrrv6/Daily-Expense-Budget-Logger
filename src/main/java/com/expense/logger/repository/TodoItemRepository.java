package com.expense.logger.repository;

import com.expense.logger.model.TodoItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TodoItemRepository extends JpaRepository<TodoItem, UUID> {
    List<TodoItem> findAllByUserIdAndDeletedAtIsNull(UUID userId);
    List<TodoItem> findAllByUserIdAndCompletedAndDeletedAtIsNull(UUID userId, boolean completed);
    Optional<TodoItem> findByIdAndUserIdAndDeletedAtIsNull(UUID id, UUID userId);
    List<TodoItem> findAllByCompletedFalseAndTargetDateLessThanEqualAndNotificationSentFalseAndDeletedAtIsNull(LocalDate date);

    @org.springframework.data.jpa.repository.Query("SELECT t FROM TodoItem t LEFT JOIN t.category c " +
        "WHERE t.user.id = :userId AND t.deletedAt IS NULL AND " +
        "(LOWER(t.name) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
        "(c IS NOT NULL AND LOWER(c.name) LIKE LOWER(CONCAT('%', :query, '%'))))")
    List<TodoItem> searchTodoItems(@org.springframework.data.repository.query.Param("userId") UUID userId, @org.springframework.data.repository.query.Param("query") String query);
}
