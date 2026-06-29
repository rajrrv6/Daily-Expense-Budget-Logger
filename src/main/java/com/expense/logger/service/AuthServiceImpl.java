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
import com.expense.logger.repository.VerificationOtpRepository;
import com.expense.logger.repository.RoleRepository;
import com.expense.logger.model.VerificationOtp;
import com.expense.logger.model.PendingRegistration;
import com.expense.logger.repository.PendingRegistrationRepository;
import com.expense.logger.security.JwtTokenProvider;
import lombok.extern.slf4j.Slf4j;
import java.util.List;
import java.util.Set;
import java.util.HashSet;
import java.util.stream.Collectors;
import com.expense.logger.model.Role;
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
    private final VerificationOtpRepository verificationOtpRepository;
    private final PendingRegistrationRepository pendingRegistrationRepository;
    private final EmailService emailService;
    private final RoleRepository roleRepository;

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
                           PasswordResetTokenRepository passwordResetTokenRepository,
                           VerificationOtpRepository verificationOtpRepository,
                           PendingRegistrationRepository pendingRegistrationRepository,
                           EmailService emailService,
                           RoleRepository roleRepository) {
        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.auditLogRepository = auditLogRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.tokenProvider = tokenProvider;
        this.passwordResetTokenRepository = passwordResetTokenRepository;
        this.verificationOtpRepository = verificationOtpRepository;
        this.pendingRegistrationRepository = pendingRegistrationRepository;
        this.emailService = emailService;
        this.roleRepository = roleRepository;
    }

    @Override
    public AuthResponseDto registerUser(UserRegisterRequestDto registerDto) {
        // If the email is the testing email 'user@example.com', we allow recreating it multiple times
        if ("user@example.com".equalsIgnoreCase(registerDto.getEmail())) {
            userRepository.findByEmailAndDeletedAtIsNull("user@example.com").ifPresent(user -> {
                userRepository.deleteRefreshTokensByUserId(user.getId());
                userRepository.deletePasswordResetTokensByUserId(user.getId());
                userRepository.deleteExpensesByUserId(user.getId());
                userRepository.deleteBudgetsByUserId(user.getId());
                userRepository.deleteTodoItemsByUserId(user.getId());
                userRepository.deleteNotificationsByUserId(user.getId());
                userRepository.deleteNotificationPreferencesByUserId(user.getId());
                userRepository.nullifyAuditLogsByUserId(user.getId());
                userRepository.delete(user);
            });
            userRepository.findByUsernameAndDeletedAtIsNull(registerDto.getUsername()).ifPresent(user -> {
                userRepository.deleteRefreshTokensByUserId(user.getId());
                userRepository.deletePasswordResetTokensByUserId(user.getId());
                userRepository.deleteExpensesByUserId(user.getId());
                userRepository.deleteBudgetsByUserId(user.getId());
                userRepository.deleteTodoItemsByUserId(user.getId());
                userRepository.deleteNotificationsByUserId(user.getId());
                userRepository.deleteNotificationPreferencesByUserId(user.getId());
                userRepository.nullifyAuditLogsByUserId(user.getId());
                userRepository.delete(user);
            });
            userRepository.flush();
        }

        if (userRepository.existsByUsernameAndDeletedAtIsNull(registerDto.getUsername())) {
            throw new BadRequestException("Username is already taken");
        }
        if (userRepository.existsByEmailAndDeletedAtIsNull(registerDto.getEmail())) {
            throw new BadRequestException("Email is already registered");
        }

        // Clean up any existing pending registrations for the same credentials to prevent conflicts
        pendingRegistrationRepository.deleteByEmail(registerDto.getEmail());
        pendingRegistrationRepository.deleteByUsername(registerDto.getUsername());

        // Generate 6-digit OTP code (hardcoded to 123456 for user@example.com for testing)
        String otpCode;
        if ("user@example.com".equalsIgnoreCase(registerDto.getEmail())) {
            otpCode = "123456";
        } else {
            otpCode = String.format("%06d", new java.security.SecureRandom().nextInt(1000000));
        }

        // Dispatch real email asynchronously
        try {
            emailService.sendEmail(
                registerDto.getEmail(),
                "Daily Expense Logger - Verify Your Email",
                buildVerificationEmailHtml(registerDto.getFirstName(), otpCode)
            );
        } catch (Exception e) {
            log.warn("Asynchronous trigger of email dispatch failed for {}: {}", registerDto.getEmail(), e.getMessage());
        }

        // Save pending registration record
        PendingRegistration pendingRegistration = PendingRegistration.builder()
                .username(registerDto.getUsername())
                .email(registerDto.getEmail())
                .firstName(registerDto.getFirstName())
                .lastName(registerDto.getLastName())
                .phoneNumber(registerDto.getPhoneNumber())
                .passwordHash(passwordEncoder.encode(registerDto.getPassword()))
                .otpCode(otpCode)
                .expiresAt(LocalDateTime.now().plusMinutes(15))
                .build();
        pendingRegistrationRepository.save(pendingRegistration);

        // Output OTP to system logs and standard output for development verification
        log.info("====================================================");
        log.info("PENDING REGISTRATION EMAIL OTP FOR {}: {}", registerDto.getEmail(), otpCode);
        log.info("====================================================");
        System.out.println("PENDING REGISTRATION EMAIL OTP FOR " + registerDto.getEmail() + ": " + otpCode);

        return AuthResponseDto.builder()
                .username(registerDto.getUsername())
                .email(registerDto.getEmail())
                .firstName(registerDto.getFirstName())
                .lastName(registerDto.getLastName())
                .phoneNumber(registerDto.getPhoneNumber())
                .roles(Set.of())
                .build();
    }

    @Override
    public AuthResponseDto loginUser(UserLoginRequestDto loginDto, String userAgent, String ipAddress) {
        String identifier = loginDto.getUsernameOrEmail();
        User user = userRepository.findByUsernameAndDeletedAtIsNull(identifier)
                .or(() -> userRepository.findByEmailAndDeletedAtIsNull(identifier))
                .orElseThrow(() -> new BadRequestException("Invalid username or password"));

        if (!user.isVerified()) {
            throw new BadRequestException("Email is not verified. Please verify your email first.");
        }

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
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .phoneNumber(user.getPhoneNumber())
                .monthlyIncome(user.getMonthlyIncome())
                .profilePicturePath(user.getProfilePicturePath())
                .roles(user.getRoles().stream().map(Role::getName).collect(Collectors.toSet()))
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
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .phoneNumber(user.getPhoneNumber())
                .monthlyIncome(user.getMonthlyIncome())
                .profilePicturePath(user.getProfilePicturePath())
                .roles(user.getRoles().stream().map(Role::getName).collect(Collectors.toSet()))
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
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .phoneNumber(user.getPhoneNumber())
                .monthlyIncome(user.getMonthlyIncome())
                .profilePicturePath(user.getProfilePicturePath())
                .createdAt(user.getCreatedAt())
                .roles(user.getRoles().stream().map(Role::getName).collect(Collectors.toSet()))
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

            // Dispatch real email asynchronously
            try {
                String resetLink = "http://localhost:5173/reset-password?token=" + rawToken;
                emailService.sendEmail(
                    user.getEmail(),
                    "Daily Expense Logger - Reset Your Password",
                    buildResetPasswordEmailHtml(user.getFirstName(), resetLink, rawToken)
                );
            } catch (Exception e) {
                log.warn("Asynchronous trigger of email dispatch failed for {}: {}", user.getEmail(), e.getMessage());
            }
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

    @Override
    public AuthResponseDto verifyOtp(com.expense.logger.dto.OtpVerificationRequestDto verifyDto, String userAgent, String ipAddress) {
        PendingRegistration pending = pendingRegistrationRepository.findFirstByEmailAndOtpCodeOrderByCreatedAtDesc(
                verifyDto.getEmail(),
                verifyDto.getOtpCode()
        ).orElseThrow(() -> new BadRequestException("Invalid or expired OTP verification code"));

        if (pending.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new BadRequestException("OTP verification code has expired");
        }

        // Prevent duplicate user registrations (in case someone else registered this email/username in parallel)
        if (userRepository.existsByUsernameAndDeletedAtIsNull(pending.getUsername())) {
            throw new BadRequestException("Username is already registered by another verified user");
        }
        if (userRepository.existsByEmailAndDeletedAtIsNull(pending.getEmail())) {
            throw new BadRequestException("Email is already registered by another verified user");
        }

        // Create the actual user account in users table only after successful OTP verification
        User user = User.builder()
                .username(pending.getUsername())
                .email(pending.getEmail())
                .firstName(pending.getFirstName())
                .lastName(pending.getLastName())
                .phoneNumber(pending.getPhoneNumber())
                .passwordHash(pending.getPasswordHash())
                .verified(true)
                .build();

        Role userRole = roleRepository.findByName("ROLE_USER")
                .orElseThrow(() -> new ResourceNotFoundException("Default ROLE_USER not found"));
        user.setRoles(new HashSet<>(List.of(userRole)));

        userRepository.save(user);

        // Delete the temporary pending registration payload
        pendingRegistrationRepository.delete(pending);

        // Audit Log registration & verification
        logEvent("USER_REGISTER", "New user registered: username=" + user.getUsername(), user);
        logEvent("USER_EMAIL_VERIFIED", "User email verified via OTP: email=" + user.getEmail(), user);

        // Generate tokens
        String accessToken = tokenProvider.generateTokenFromUsername(user.getUsername(), accessTokenExpirationMs);
        String refreshTokenVal = tokenProvider.generateTokenFromUsername(user.getUsername(), refreshTokenExpirationMs);

        // Save refresh token
        saveRefreshToken(user, refreshTokenVal, UUID.randomUUID(), userAgent, ipAddress);

        return AuthResponseDto.builder()
                .accessToken(accessToken)
                .refreshToken(refreshTokenVal)
                .username(user.getUsername())
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .phoneNumber(user.getPhoneNumber())
                .monthlyIncome(user.getMonthlyIncome())
                .profilePicturePath(user.getProfilePicturePath())
                .roles(user.getRoles().stream().map(Role::getName).collect(Collectors.toSet()))
                .build();
    }

    @Override
    public void resendOtp(com.expense.logger.dto.OtpResendRequestDto resendDto) {
        PendingRegistration pending = pendingRegistrationRepository.findFirstByEmailOrderByCreatedAtDesc(resendDto.getEmail())
                .orElseThrow(() -> new BadRequestException("No pending registration found for this email address"));

        // Generate new 6-digit OTP code (hardcoded to 123456 for user@example.com for testing)
        String otpCode;
        if ("user@example.com".equalsIgnoreCase(pending.getEmail())) {
            otpCode = "123456";
        } else {
            otpCode = String.format("%06d", new java.security.SecureRandom().nextInt(1000000));
        }

        pending.setOtpCode(otpCode);
        pending.setExpiresAt(LocalDateTime.now().plusMinutes(15));
        pendingRegistrationRepository.save(pending);

        // Dispatch email
        try {
            emailService.sendEmail(
                pending.getEmail(),
                "Daily Expense Logger - Verify Your Email",
                buildVerificationEmailHtml(pending.getFirstName(), otpCode)
            );
        } catch (Exception e) {
            log.warn("Asynchronous trigger of email dispatch failed for {}: {}", pending.getEmail(), e.getMessage());
        }

        // Output OTP to system logs and standard output for development verification
        log.info("====================================================");
        log.info("RESENT PENDING REGISTRATION EMAIL OTP FOR {}: {}", pending.getEmail(), otpCode);
        log.info("====================================================");
        System.out.println("RESENT PENDING REGISTRATION EMAIL OTP FOR " + pending.getEmail() + ": " + otpCode);
    }

    private String buildVerificationEmailHtml(String firstName, String otpCode) {
        return "<!DOCTYPE html>\n" +
                "<html>\n" +
                "<body style=\"font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 40px 20px;\">\n" +
                "  <div style=\"max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1); border: 1px solid #e2e8f0;\">\n" +
                "    <div style=\"background: linear-gradient(135deg, #4f46e5 0%, #3730a3 100%); padding: 32px 24px; text-align: center;\">\n" +
                "      <h1 style=\"color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.025em;\">Daily Expense Logger</h1>\n" +
                "    </div>\n" +
                "    <div style=\"padding: 40px 32px; color: #334155; line-height: 1.6;\">\n" +
                "      <div style=\"font-size: 18px; font-weight: 600; color: #0f172a; margin-bottom: 16px;\">Hello " + (firstName == null ? "there" : firstName) + ",</div>\n" +
                "      <div style=\"font-size: 15px; margin-bottom: 24px;\">Thank you for joining Daily Expense Logger! To complete your registration and verify your email address, please use the following one-time verification code:</div>\n" +
                "      <div style=\"text-align: center; margin: 32px 0;\">\n" +
                "        <div style=\"display: inline-block; font-family: 'Courier New', Courier, monospace; font-size: 32px; font-weight: 700; color: #4f46e5; letter-spacing: 4px; padding: 12px 28px; background-color: #e0e7ff; border-radius: 8px; border: 1px dashed #818cf8;\">" + otpCode + "</div>\n" +
                "        <div style=\"font-size: 13px; color: #64748b; text-align: center; margin-top: 16px;\">This verification code is valid for <strong>15 minutes</strong>.</div>\n" +
                "      </div>\n" +
                "      <div style=\"margin-top: 32px; border-top: 1px solid #e2e8f0; padding-top: 20px; font-size: 14px; color: #64748b;\">\n" +
                "        If you did not request this, please ignore this email or contact support.\n" +
                "      </div>\n" +
                "    </div>\n" +
                "    <div style=\"background-color: #f8fafc; padding: 24px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9;\">\n" +
                "      &copy; 2026 Daily Expense Logger. All rights reserved.<br>\n" +
                "      <a href=\"http://localhost:5173\" style=\"color: #4f46e5; text-decoration: none;\">Visit Dashboard</a> &bull; <a href=\"mailto:support@budgetlogger.com\" style=\"color: #4f46e5; text-decoration: none;\">Contact Support</a>\n" +
                "    </div>\n" +
                "  </div>\n" +
                "</body>\n" +
                "</html>";
    }

    private String buildResetPasswordEmailHtml(String firstName, String resetLink, String rawToken) {
        return "<!DOCTYPE html>\n" +
                "<html>\n" +
                "<body style=\"font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 40px 20px;\">\n" +
                "  <div style=\"max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1); border: 1px solid #e2e8f0;\">\n" +
                "    <div style=\"background: linear-gradient(135deg, #4f46e5 0%, #3730a3 100%); padding: 32px 24px; text-align: center;\">\n" +
                "      <h1 style=\"color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.025em;\">Daily Expense Logger</h1>\n" +
                "    </div>\n" +
                "    <div style=\"padding: 40px 32px; color: #334155; line-height: 1.6;\">\n" +
                "      <div style=\"font-size: 18px; font-weight: 600; color: #0f172a; margin-bottom: 16px;\">Hello " + (firstName == null ? "there" : firstName) + ",</div>\n" +
                "      <div style=\"font-size: 15px; margin-bottom: 24px;\">We received a request to reset your password for your Daily Expense Logger account. Click the button below to choose a new password:</div>\n" +
                "      <div style=\"text-align: center; margin: 32px 0;\">\n" +
                "        <a href=\"" + resetLink + "\" style=\"display: inline-block; padding: 12px 28px; font-weight: 600; font-size: 15px; color: #ffffff !important; background-color: #4f46e5; text-decoration: none; border-radius: 8px; box-shadow: 0 2px 4px rgba(79, 70, 229, 0.3);\">Reset Password</a>\n" +
                "      </div>\n" +
                "      <div style=\"font-size: 15px; margin-bottom: 12px;\">Alternatively, you can manually enter the following reset token on the password reset page:</div>\n" +
                "      <div style=\"background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; text-align: center; margin: 24px 0;\">\n" +
                "        <div style=\"font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; margin-bottom: 6px;\">Reset Token</div>\n" +
                "        <div style=\"font-family: monospace; font-size: 16px; font-weight: 600; color: #0f172a; word-break: break-all;\">" + rawToken + "</div>\n" +
                "      </div>\n" +
                "      <div style=\"font-size: 13px; color: #64748b; text-align: center; margin-top: 16px;\">This link and token will expire in <strong>15 minutes</strong>.</div>\n" +
                "      <div style=\"margin-top: 32px; border-top: 1px solid #e2e8f0; padding-top: 20px; font-size: 14px; color: #64748b;\">\n" +
                "        If you did not request a password reset, please ignore this email or contact support.\n" +
                "      </div>\n" +
                "    </div>\n" +
                "    <div style=\"background-color: #f8fafc; padding: 24px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9;\">\n" +
                "      &copy; 2026 Daily Expense Logger. All rights reserved.<br>\n" +
                "      <a href=\"http://localhost:5173\" style=\"color: #4f46e5; text-decoration: none;\">Visit Dashboard</a> &bull; <a href=\"mailto:support@budgetlogger.com\" style=\"color: #4f46e5; text-decoration: none;\">Contact Support</a>\n" +
                "    </div>\n" +
                "  </div>\n" +
                "</body>\n" +
                "</html>";
    }
}
