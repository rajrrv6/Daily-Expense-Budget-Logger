package com.expense.logger.repository;

import com.expense.logger.model.VerificationOtp;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface VerificationOtpRepository extends JpaRepository<VerificationOtp, UUID> {
    Optional<VerificationOtp> findFirstByEmailAndOtpCodeAndUsedFalseOrderByCreatedAtDesc(String email, String otpCode);
}
