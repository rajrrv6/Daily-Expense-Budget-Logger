package com.expense.logger.repository;

import com.expense.logger.model.Budget;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface BudgetRepository extends JpaRepository<Budget, UUID> {
    List<Budget> findAllByUserIdAndDeletedAtIsNull(UUID userId);
    Optional<Budget> findByIdAndUserIdAndDeletedAtIsNull(UUID id, UUID userId);
    List<Budget> findAllByUserIdAndCategoryIdAndDeletedAtIsNull(UUID userId, Long categoryId);
}
