package com.expense.logger.repository;

import com.expense.logger.model.PendingRegistration;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface PendingRegistrationRepository extends JpaRepository<PendingRegistration, UUID> {
    Optional<PendingRegistration> findFirstByEmailAndOtpCodeOrderByCreatedAtDesc(String email, String otpCode);
    Optional<PendingRegistration> findFirstByEmailOrderByCreatedAtDesc(String email);
    void deleteByEmail(String email);
    void deleteByUsername(String username);
}
