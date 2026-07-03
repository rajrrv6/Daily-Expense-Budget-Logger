package com.expense.logger.service;

public interface JwtBlacklistService {
    void blacklistToken(String token);
    boolean isBlacklisted(String token);
    void blacklistJti(String jti, long expirationMs);
    
    void blacklistUser(String username, long durationMs);
    boolean isUserBlacklisted(String username);

    void clearBlacklist();
}
