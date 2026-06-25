package com.expense.logger.repository;

import com.expense.logger.model.RefreshToken;
import com.expense.logger.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface RefreshTokenRepository extends JpaRepository<RefreshToken, UUID> {
    Optional<RefreshToken> findByTokenHash(String tokenHash);
    void deleteByUser(User user);
    void deleteByFamilyId(UUID familyId);
    List<RefreshToken> findAllByUser(User user);
    
    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.transaction.annotation.Transactional
    void deleteByExpiresAtBefore(java.time.LocalDateTime now);
}
