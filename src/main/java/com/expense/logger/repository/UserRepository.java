package com.expense.logger.repository;

import com.expense.logger.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByEmailAndDeletedAtIsNull(String email);
    Optional<User> findByUsernameAndDeletedAtIsNull(String username);
    boolean existsByEmailAndDeletedAtIsNull(String email);
    boolean existsByUsernameAndDeletedAtIsNull(String username);

    @Modifying
    @Transactional
    @Query(value = "DELETE FROM refresh_tokens WHERE user_id = :userId", nativeQuery = true)
    void deleteRefreshTokensByUserId(@Param("userId") UUID userId);

    @Modifying
    @Transactional
    @Query(value = "DELETE FROM password_reset_tokens WHERE user_id = :userId", nativeQuery = true)
    void deletePasswordResetTokensByUserId(@Param("userId") UUID userId);

    @Modifying
    @Transactional
    @Query(value = "DELETE FROM expenses WHERE user_id = :userId", nativeQuery = true)
    void deleteExpensesByUserId(@Param("userId") UUID userId);

    @Modifying
    @Transactional
    @Query(value = "DELETE FROM budgets WHERE user_id = :userId", nativeQuery = true)
    void deleteBudgetsByUserId(@Param("userId") UUID userId);

    @Modifying
    @Transactional
    @Query(value = "DELETE FROM todo_items WHERE user_id = :userId", nativeQuery = true)
    void deleteTodoItemsByUserId(@Param("userId") UUID userId);

    @Modifying
    @Transactional
    @Query(value = "DELETE FROM notifications WHERE user_id = :userId", nativeQuery = true)
    void deleteNotificationsByUserId(@Param("userId") UUID userId);

    @Modifying
    @Transactional
    @Query(value = "DELETE FROM notification_preferences WHERE user_id = :userId", nativeQuery = true)
    void deleteNotificationPreferencesByUserId(@Param("userId") UUID userId);

    @Modifying
    @Transactional
    @Query(value = "UPDATE audit_logs SET user_id = NULL WHERE user_id = :userId", nativeQuery = true)
    void nullifyAuditLogsByUserId(@Param("userId") UUID userId);
}
