package com.expense.logger.controller;

import com.expense.logger.dto.AuthResponseDto;
import com.expense.logger.dto.ForgotPasswordRequestDto;
import com.expense.logger.dto.ResetPasswordRequestDto;
import com.expense.logger.dto.UserLoginRequestDto;
import com.expense.logger.dto.UserRegisterRequestDto;
import com.expense.logger.dto.OtpResendRequestDto;
import com.expense.logger.dto.OtpVerificationRequestDto;
import com.expense.logger.dto.UserResponseDto;
import java.util.Map;
import com.expense.logger.service.AuthService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService authService;

    @Value("${app.cookie.secure}")
    private boolean cookieSecure;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponseDto> register(@Valid @RequestBody UserRegisterRequestDto registerDto,
                                                    HttpServletResponse response) {
        AuthResponseDto result = authService.registerUser(registerDto);
        if (result.getRefreshToken() != null) {
            setRefreshTokenCookie(response, result.getRefreshToken());
        }
        // Clean DTO for body response (do not expose refresh token in JSON body)
        result.setRefreshToken(null);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<AuthResponseDto> verifyOtp(@Valid @RequestBody OtpVerificationRequestDto verifyDto,
                                                     HttpServletRequest request,
                                                     HttpServletResponse response) {
        String userAgent = request.getHeader(HttpHeaders.USER_AGENT);
        String ipAddress = request.getRemoteAddr();
        AuthResponseDto result = authService.verifyOtp(verifyDto, userAgent, ipAddress);
        if (result.getRefreshToken() != null) {
            setRefreshTokenCookie(response, result.getRefreshToken());
        }
        result.setRefreshToken(null);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/resend-otp")
    public ResponseEntity<Map<String, String>> resendOtp(@Valid @RequestBody OtpResendRequestDto resendDto) {
        authService.resendOtp(resendDto);
        return ResponseEntity.ok(Map.of("message", "A new verification code has been sent."));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponseDto> login(@Valid @RequestBody UserLoginRequestDto loginDto,
                                                 HttpServletRequest request,
                                                 HttpServletResponse response) {
        String userAgent = request.getHeader(HttpHeaders.USER_AGENT);
        String ipAddress = request.getRemoteAddr();

        AuthResponseDto result = authService.loginUser(loginDto, userAgent, ipAddress);
        setRefreshTokenCookie(response, result.getRefreshToken());
        result.setRefreshToken(null);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/refresh")
    public ResponseEntity<AuthResponseDto> refresh(HttpServletRequest request,
                                                   HttpServletResponse response) {
        String refreshToken = extractRefreshTokenFromCookies(request);
        String userAgent = request.getHeader(HttpHeaders.USER_AGENT);
        String ipAddress = request.getRemoteAddr();

        AuthResponseDto result = authService.refreshSession(refreshToken, userAgent, ipAddress);
        setRefreshTokenCookie(response, result.getRefreshToken());
        result.setRefreshToken(null);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletRequest request, HttpServletResponse response) {
        String refreshToken = extractRefreshTokenFromCookies(request);
        authService.logoutUser(refreshToken);
        deleteRefreshTokenCookie(response);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<Map<String, String>> forgotPassword(
            @Valid @RequestBody ForgotPasswordRequestDto forgotPasswordDto,
            HttpServletRequest request) {
        String userAgent = request.getHeader(HttpHeaders.USER_AGENT);
        String ipAddress = request.getRemoteAddr();
        authService.requestForgotPassword(forgotPasswordDto, ipAddress, userAgent);
        return ResponseEntity.ok(Map.of("message", "If the email matches an active account, a password reset link has been sent."));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<Map<String, String>> resetPassword(
            @Valid @RequestBody ResetPasswordRequestDto resetPasswordDto) {
        authService.resetPassword(resetPasswordDto);
        return ResponseEntity.ok(Map.of("message", "Password has been reset successfully."));
    }

    @GetMapping("/me")
    public ResponseEntity<UserResponseDto> getProfile(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(401).build();
        }
        UserDetails userPrincipal = (UserDetails) authentication.getPrincipal();
        UserResponseDto profile = authService.getCurrentUserProfile(userPrincipal.getUsername());
        return ResponseEntity.ok(profile);
    }

    private void setRefreshTokenCookie(HttpServletResponse response, String token) {
        ResponseCookie cookie = ResponseCookie.from("refreshToken", token)
                .httpOnly(true)
                .secure(cookieSecure) // Dynamic secure flag based on profile settings
                .path("/api/v1/auth/refresh")
                .maxAge(7 * 24 * 60 * 60) // 7 days
                .sameSite("Strict")
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    private void deleteRefreshTokenCookie(HttpServletResponse response) {
        ResponseCookie cookie = ResponseCookie.from("refreshToken", "")
                .httpOnly(true)
                .secure(cookieSecure) // Dynamic secure flag based on profile settings
                .path("/api/v1/auth/refresh")
                .maxAge(0) // Expire immediately
                .sameSite("Strict")
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    private String extractRefreshTokenFromCookies(HttpServletRequest request) {
        if (request.getCookies() != null) {
            for (Cookie cookie : request.getCookies()) {
                if ("refreshToken".equals(cookie.getName())) {
                    return cookie.getValue();
                }
            }
        }
        return "";
    }
}
