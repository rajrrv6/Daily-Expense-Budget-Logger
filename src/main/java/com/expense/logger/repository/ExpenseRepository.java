package com.expense.logger.repository;

import com.expense.logger.model.Expense;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ExpenseRepository extends JpaRepository<Expense, UUID> {
    Page<Expense> findAllByUserIdAndDeletedAtIsNull(UUID userId, Pageable pageable);
    Page<Expense> findAllByUserIdAndTransactionDateBetweenAndDeletedAtIsNull(
            UUID userId, LocalDate startDate, LocalDate endDate, Pageable pageable);
    
    List<Expense> findAllByUserIdAndDeletedAtIsNull(UUID userId);
    List<Expense> findAllByUserIdAndTransactionDateBetweenAndDeletedAtIsNull(
            UUID userId, LocalDate startDate, LocalDate endDate);

    Optional<Expense> findByIdAndUserIdAndDeletedAtIsNull(UUID id, UUID userId);
    
    long countByUserIdAndCategoryIdAndDeletedAtIsNull(UUID userId, Long categoryId);
    org.springframework.data.domain.Page<Expense> findAllByUserIdAndCategoryIdAndDeletedAtIsNull(
            UUID userId, Long categoryId, org.springframework.data.domain.Pageable pageable);

    boolean existsByNameAndAmountAndTransactionDateAndUserIdAndDeletedAtIsNull(
            String name, java.math.BigDecimal amount, java.time.LocalDate transactionDate, java.util.UUID userId
    );

    @org.springframework.data.jpa.repository.Query("SELECT e FROM Expense e JOIN e.category c " +
        "WHERE e.user.id = :userId AND e.deletedAt IS NULL AND " +
        "(LOWER(e.name) LIKE LOWER(CONCAT('%', :query, '%')) OR LOWER(c.name) LIKE LOWER(CONCAT('%', :query, '%')))")
    List<Expense> searchExpenses(@org.springframework.data.repository.query.Param("userId") UUID userId, @org.springframework.data.repository.query.Param("query") String query);
}
