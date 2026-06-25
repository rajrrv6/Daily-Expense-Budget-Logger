package com.expense.logger.service;

import com.expense.logger.dto.AuthResponseDto;
import com.expense.logger.dto.ForgotPasswordRequestDto;
import com.expense.logger.dto.ResetPasswordRequestDto;
import com.expense.logger.dto.UserLoginRequestDto;
import com.expense.logger.dto.UserRegisterRequestDto;
import com.expense.logger.dto.UserResponseDto;
import com.expense.logger.exception.BadRequestException;
import com.expense.logger.exception.ResourceNotFoundException;
import com.expense.logger.model.AuditLog;
import com.expense.logger.model.RefreshToken;
import com.expense.logger.model.PasswordResetToken;
import com.expense.logger.model.User;
import com.expense.logger.repository.AuditLogRepository;
import com.expense.logger.repository.PasswordResetTokenRepository;
import com.expense.logger.repository.RefreshTokenRepository;
import com.expense.logger.repository.UserRepository;
import com.expense.logger.security.JwtTokenProvider;
import lombok.extern.slf4j.Slf4j;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Service
@Transactional
@Slf4j
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final AuditLogRepository auditLogRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider tokenProvider;
    private final PasswordResetTokenRepository passwordResetTokenRepository;

    @Value("${app.jwt.accessTokenExpirationMs}")
    private long accessTokenExpirationMs;

    @Value("${app.jwt.refreshTokenExpirationMs}")
    private long refreshTokenExpirationMs;

    public AuthServiceImpl(UserRepository userRepository,
                           RefreshTokenRepository refreshTokenRepository,
                           AuditLogRepository auditLogRepository,
                           PasswordEncoder passwordEncoder,
                           AuthenticationManager authenticationManager,
                           JwtTokenProvider tokenProvider,
                           PasswordResetTokenRepository passwordResetTokenRepository) {
        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.auditLogRepository = auditLogRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.tokenProvider = tokenProvider;
        this.passwordResetTokenRepository = passwordResetTokenRepository;
    }

    @Override
    public AuthResponseDto registerUser(UserRegisterRequestDto registerDto) {
        if (userRepository.existsByUsernameAndDeletedAtIsNull(registerDto.getUsername())) {
            throw new BadRequestException("Username is already taken");
        }
        if (userRepository.existsByEmailAndDeletedAtIsNull(registerDto.getEmail())) {
            throw new BadRequestException("Email is already registered");
        }

        User user = User.builder()
                .username(registerDto.getUsername())
                .email(registerDto.getEmail())
                .passwordHash(passwordEncoder.encode(registerDto.getPassword()))
                .build();

        userRepository.save(user);

        // Audit Log registration
        logEvent("USER_REGISTER", "New user registered: username=" + user.getUsername(), user);

        // Generate tokens
        String accessToken = tokenProvider.generateTokenFromUsername(user.getUsername(), accessTokenExpirationMs);
        String refreshTokenVal = tokenProvider.generateTokenFromUsername(user.getUsername(), refreshTokenExpirationMs);

        // Save refresh token
        saveRefreshToken(user, refreshTokenVal, UUID.randomUUID(), "System Registration", "N/A");

        return AuthResponseDto.builder()
                .accessToken(accessToken)
                .refreshToken(refreshTokenVal)
                .username(user.getUsername())
                .email(user.getEmail())
                .build();
    }

    @Override
    public AuthResponseDto loginUser(UserLoginRequestDto loginDto, String userAgent, String ipAddress) {
        String identifier = loginDto.getUsernameOrEmail();
        User user = userRepository.findByUsernameAndDeletedAtIsNull(identifier)
                .or(() -> userRepository.findByEmailAndDeletedAtIsNull(identifier))
                .orElseThrow(() -> new BadRequestException("Invalid username or password"));

        if (user.getLockoutUntil() != null && user.getLockoutUntil().isAfter(LocalDateTime.now())) {
            throw new BadRequestException("Account is locked due to multiple failed login attempts. Lockout active.");
        }

        Authentication authentication;
        try {
            authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(user.getUsername(), loginDto.getPassword())
            );
            
            // Reset attempts on successful login
            user.setFailedLoginAttempts(0);
            user.setLockoutUntil(null);
            userRepository.save(user);
        } catch (Exception e) {
            int attempts = user.getFailedLoginAttempts() + 1;
            user.setFailedLoginAttempts(attempts);
            if (attempts >= 5) {
                user.setLockoutUntil(LocalDateTime.now().plusMinutes(15));
            }
            userRepository.save(user);

            if (attempts >= 5) {
                throw new BadRequestException("Account is locked due to multiple failed login attempts. Try again in 15 minutes.");
            }
            throw new BadRequestException("Invalid username or password");
        }

        SecurityContextHolder.getContext().setAuthentication(authentication);

        String accessToken = tokenProvider.generateAccessToken(authentication);
        String refreshTokenVal = tokenProvider.generateRefreshToken(authentication);

        // Save refresh token in a new token family
        saveRefreshToken(user, refreshTokenVal, UUID.randomUUID(), userAgent, ipAddress);

        // Audit Log login
        logEvent("USER_LOGIN", "User logged in. IP: " + ipAddress, user);

        return AuthResponseDto.builder()
                .accessToken(accessToken)
                .refreshToken(refreshTokenVal)
                .username(user.getUsername())
                .email(user.getEmail())
                .build();
    }

    @Override
    public AuthResponseDto refreshSession(String refreshTokenVal, String userAgent, String ipAddress) {
        if (!tokenProvider.validateToken(refreshTokenVal)) {
            throw new BadRequestException("Invalid or expired refresh token");
        }

        String username = tokenProvider.getUsernameFromJwt(refreshTokenVal);
        User user = userRepository.findByUsernameAndDeletedAtIsNull(username)
                .orElseThrow(() -> new BadRequestException("User associated with token not found"));

        String tokenHash = hashToken(refreshTokenVal);
        Optional<RefreshToken> tokenOpt = refreshTokenRepository.findByTokenHash(tokenHash);

        if (tokenOpt.isEmpty()) {
            throw new BadRequestException("Refresh token session not found");
        }

        RefreshToken storedToken = tokenOpt.get();

        // Reuse detection
        if (storedToken.isUsed()) {
            // Revoke all tokens in family
            refreshTokenRepository.deleteByFamilyId(storedToken.getFamilyId());
            // Audit Log security breach
            logEvent("SECURITY_BREACH", "Refresh token reuse attempt detected. Entire session family revoked.", user);
            log.warn("Security Alert: Refresh token reuse detected for user {}. Revoking all sessions in family {}.", user.getUsername(), storedToken.getFamilyId());
            throw new BadRequestException("Security Warning: Token reuse detected. Session revoked.");
        }

        if (storedToken.getExpiresAt().isBefore(LocalDateTime.now())) {
            refreshTokenRepository.delete(storedToken);
            throw new BadRequestException("Refresh token has expired");
        }

        // Rotate token (RTR)
        storedToken.setUsed(true);
        refreshTokenRepository.save(storedToken);

        String newAccessToken = tokenProvider.generateTokenFromUsername(username, accessTokenExpirationMs);
        String newRefreshTokenVal = tokenProvider.generateTokenFromUsername(username, refreshTokenExpirationMs);

        // Save rotated refresh token keeping the same familyId
        saveRefreshToken(user, newRefreshTokenVal, storedToken.getFamilyId(), userAgent, ipAddress);

        return AuthResponseDto.builder()
                .accessToken(newAccessToken)
                .refreshToken(newRefreshTokenVal)
                .username(user.getUsername())
                .email(user.getEmail())
                .build();
    }

    @Override
    public void logoutUser(String refreshTokenVal) {
        if (refreshTokenVal == null || refreshTokenVal.trim().isEmpty()) {
            return;
        }
        String tokenHash = hashToken(refreshTokenVal);
        refreshTokenRepository.findByTokenHash(tokenHash).ifPresent(token -> {
            // Audit Log logout
            logEvent("USER_LOGOUT", "User logged out", token.getUser());
            refreshTokenRepository.delete(token);
        });
    }

    @Override
    @Transactional(readOnly = true)
    public UserResponseDto getCurrentUserProfile(String username) {
        User user = userRepository.findByUsernameAndDeletedAtIsNull(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with username: " + username));
        
        return UserResponseDto.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .createdAt(user.getCreatedAt())
                .build();
    }

    private void logEvent(String actionType, String description, User user) {
        AuditLog auditLog = AuditLog.builder()
                .actionType(actionType)
                .description(description)
                .user(user)
                .build();
        auditLogRepository.save(auditLog);
    }

    private void saveRefreshToken(User user, String tokenVal, UUID familyId, String userAgent, String ipAddress) {
        RefreshToken refreshToken = RefreshToken.builder()
                .tokenHash(hashToken(tokenVal))
                .familyId(familyId)
                .user(user)
                .userAgent(userAgent)
                .ipAddress(ipAddress)
                .expiresAt(LocalDateTime.now().plusNanos(refreshTokenExpirationMs * 1000000L))
                .used(false)
                .build();
        refreshTokenRepository.save(refreshToken);
    }

    private String hashToken(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(token.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("Error hashing token", e);
        }
    }

    @Override
    public void requestForgotPassword(ForgotPasswordRequestDto requestDto, String ipAddress, String userAgent) {
        Optional<User> userOpt = userRepository.findByEmailAndDeletedAtIsNull(requestDto.getEmail());
        
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            
            // Invalidate all previous active reset tokens for this user
            List<PasswordResetToken> activeTokens = passwordResetTokenRepository.findAllByUserAndUsedFalse(user);
            for (PasswordResetToken token : activeTokens) {
                token.setUsed(true);
            }
            passwordResetTokenRepository.saveAll(activeTokens);
            
            // Generate secure random token
            String rawToken = UUID.randomUUID().toString();
            String hashedToken = hashToken(rawToken);
            
            // Set token expiry (15 minutes)
            LocalDateTime expiresAt = LocalDateTime.now().plusMinutes(15);
            
            // Save reset token
            PasswordResetToken resetToken = PasswordResetToken.builder()
                    .user(user)
                    .tokenHash(hashedToken)
                    .expiresAt(expiresAt)
                    .used(false)
                    .requestIp(ipAddress)
                    .userAgent(userAgent)
                    .build();
            passwordResetTokenRepository.save(resetToken);
            
            // Log audit event
            logEvent("PASSWORD_RESET_REQUEST", "Password reset requested for user: " + user.getUsername(), user);
            
            log.info("Password reset raw token for user {}: {}", user.getUsername(), rawToken);
        } else {
            log.info("Password reset requested for non-existent email: {}", requestDto.getEmail());
        }
    }

    @Override
    public void resetPassword(ResetPasswordRequestDto requestDto) {
        String hashedToken = hashToken(requestDto.getToken());
        
        PasswordResetToken resetToken = passwordResetTokenRepository.findByTokenHash(hashedToken)
                .orElseThrow(() -> new BadRequestException("Invalid or expired password reset token"));
        
        if (resetToken.isUsed()) {
            throw new BadRequestException("Password reset token has already been used");
        }
        if (resetToken.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new BadRequestException("Password reset token has expired");
        }
        
        User user = resetToken.getUser();
        
        // Hash new password and update user
        user.setPasswordHash(passwordEncoder.encode(requestDto.getNewPassword()));
        
        // Reset failed login attempts and lockouts on password reset success
        user.setFailedLoginAttempts(0);
        user.setLockoutUntil(null);
        userRepository.save(user);
        
        // Invalidate all active refresh tokens for the user
        refreshTokenRepository.deleteByUser(user);
        
        // Mark reset token as used
        resetToken.setUsed(true);
        resetToken.setUsedAt(LocalDateTime.now());
        passwordResetTokenRepository.save(resetToken);
        
        // Log audit event
        logEvent("PASSWORD_RESET_SUCCESS", "Password reset successfully for user: " + user.getUsername(), user);
    }
}
