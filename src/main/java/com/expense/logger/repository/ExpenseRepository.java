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
}
