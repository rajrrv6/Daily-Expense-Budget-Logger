package com.expense.logger.service;

import com.expense.logger.repository.PasswordResetTokenRepository;
import com.expense.logger.repository.RefreshTokenRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Component
@Slf4j
public class TokenCleanupScheduledTask {

    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final com.expense.logger.repository.VerificationOtpRepository verificationOtpRepository;

    public TokenCleanupScheduledTask(PasswordResetTokenRepository passwordResetTokenRepository,
                                     RefreshTokenRepository refreshTokenRepository,
                                     com.expense.logger.repository.VerificationOtpRepository verificationOtpRepository) {
        this.passwordResetTokenRepository = passwordResetTokenRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.verificationOtpRepository = verificationOtpRepository;
    }

    @Scheduled(cron = "${app.cleanup.cron:0 0 2 * * *}")
    @Transactional
    public void cleanupExpiredTokens() {
        log.info("Starting scheduled cleanup task for expired tokens...");
        long startTime = System.currentTimeMillis();
        try {
            LocalDateTime now = LocalDateTime.now();
            passwordResetTokenRepository.deleteByExpiresAtBefore(now);
            refreshTokenRepository.deleteByExpiresAtBefore(now);
            verificationOtpRepository.deleteByExpiresAtBefore(now);
            long duration = System.currentTimeMillis() - startTime;
            log.info("Scheduled token cleanup successfully finished in {} ms.", duration);
        } catch (Exception e) {
            log.error("Scheduled token cleanup task failed!", e);
        }
    }
}
