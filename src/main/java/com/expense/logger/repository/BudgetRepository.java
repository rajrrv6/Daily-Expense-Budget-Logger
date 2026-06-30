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

    @org.springframework.data.jpa.repository.Query("SELECT b FROM Budget b LEFT JOIN b.category c " +
        "WHERE b.user.id = :userId AND b.deletedAt IS NULL AND " +
        "((c IS NOT NULL AND LOWER(c.name) LIKE LOWER(CONCAT('%', :query, '%'))) OR " +
        "(c IS NULL AND LOWER('Global') LIKE LOWER(CONCAT('%', :query, '%'))))")
    List<Budget> searchBudgets(@org.springframework.data.repository.query.Param("userId") UUID userId, @org.springframework.data.repository.query.Param("query") String query);
}
