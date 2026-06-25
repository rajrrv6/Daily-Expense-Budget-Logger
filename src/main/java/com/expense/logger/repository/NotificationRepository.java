package com.expense.logger.repository;

import com.expense.logger.model.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, UUID> {
    Page<Notification> findAllByUserIdAndDeletedAtIsNull(UUID userId, Pageable pageable);
    List<Notification> findAllByUserIdAndReadFalseAndDeletedAtIsNull(UUID userId);
    Optional<Notification> findByIdAndUserIdAndDeletedAtIsNull(UUID id, UUID userId);
    long countByUserIdAndReadFalseAndDeletedAtIsNull(UUID userId);
}
