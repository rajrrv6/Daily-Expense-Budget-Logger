package com.expense.logger.repository;

import com.expense.logger.model.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {
    Page<AuditLog> findAllByUserId(UUID userId, Pageable pageable);
    List<AuditLog> findAllByOrderByCreatedAtDesc();

    @Query("SELECT a FROM AuditLog a WHERE " +
           "(:actionType IS NULL OR a.actionType = :actionType) AND " +
           "(:search IS NULL OR LOWER(a.user.username) LIKE :search OR LOWER(a.description) LIKE :search)")
    Page<AuditLog> findLogsFiltered(@Param("actionType") String actionType,
                                    @Param("search") String search,
                                    Pageable pageable);
}
