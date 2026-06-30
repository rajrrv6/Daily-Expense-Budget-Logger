/**
 * AuthController
 * ---------------------------------------------------------
 * Manages the user authentication lifecycle endpoints, including:
 * - User Registration & OTP-based verification
 * - Secure login sessions using JWT access tokens
 * - Token refresh operations via HttpOnly cookies (mitigating XSS)
 * - Sign Out, Forgot Password, and Secure Password resets
 * - Authenticated session queries (/me profile retrieval)
 */
package com.expense.logger.controller;

import com.expense.logger.dto.AuthResponseDto;
import com.expense.logger.dto.ForgotPasswordRequestDto;
import com.expense.logger.dto.OtpResendRequestDto;
import com.expense.logger.dto.OtpVerificationRequestDto;
import com.expense.logger.dto.ResetPasswordRequestDto;
import com.expense.logger.dto.UserLoginRequestDto;
import com.expense.logger.dto.UserRegisterRequestDto;
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

    // Configured via application properties to enforce SSL/TLS on cookies in
    // production
    @Value("${app.cookie.secure}")
    private boolean cookieSecure;

    /**
     * Dependency injection constructor.
     */
    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    /**
     * Registers a new user account pending OTP verification.
     * Enforces field validation rules before initiating the account creation
     * process.
     *
     * @param registerDto Contains registration details (username, email, password,
     *                    profile info)
     * @param response    Used to set the secure refresh token cookie if applicable
     * @return AuthResponseDto containing the registered profile detail
     */
    @PostMapping("/register")
    public ResponseEntity<AuthResponseDto> register(@Valid @RequestBody UserRegisterRequestDto registerDto,
            HttpServletResponse response) {
        AuthResponseDto result = authService.registerUser(registerDto);
        if (result.getRefreshToken() != null) {
            setRefreshTokenCookie(response, result.getRefreshToken());
        }
        // Clean DTO for body response (do not expose refresh token in JSON body to
        // minimize token leak vectors)
        result.setRefreshToken(null);
        return ResponseEntity.ok(result);
    }

    /**
     * Verifies the user's registration using an OTP code sent via email.
     * Captures user-agent and client IP logs for security auditing.
     *
     * @param verifyDto Verification details containing email and code
     * @param request   Servlet request context to extract user agent and remote
     *                  address
     * @param response  Used to attach the HttpOnly session refresh cookie
     * @return AuthResponseDto with the generated JWT access token
     */
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

    /**
     * Triggers sending a new verification code to the target email.
     *
     * @param resendDto Contains user identification email details
     * @return A success confirmation message
     */
    @PostMapping("/resend-otp")
    public ResponseEntity<Map<String, String>> resendOtp(@Valid @RequestBody OtpResendRequestDto resendDto) {
        authService.resendOtp(resendDto);
        return ResponseEntity.ok(Map.of("message", "A new verification code has been sent."));
    }

    /**
     * authenticates user login credentials.
     * Sets a secure HttpOnly cookie containing the persistent refresh session
     * token.
     *
     * @param loginDto Login input (username/email, password)
     * @param request  Extracted for device audits
     * @param response Injected to write response headers
     * @return Active authentication access details
     */
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

    /**
     * Refreshes the short-lived JWT access token using the stored refresh cookie.
     * Rotates the refresh token to maintain secure session integrity.
     */
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

    /**
     * Terminates the user session. Invalidates the active refresh token token
     * and instructs the client browser to immediately expire cookie stores.
     */
    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletRequest request, HttpServletResponse response) {
        String refreshToken = extractRefreshTokenFromCookies(request);
        authService.logoutUser(refreshToken);
        deleteRefreshTokenCookie(response);
        return ResponseEntity.ok().build();
    }

    /**
     * Generates a secure, temporary password-reset token link and logs the request.
     * Sends an email notification instructing the user on account recovery.
     */
    @PostMapping("/forgot-password")
    public ResponseEntity<Map<String, String>> forgotPassword(
            @Valid @RequestBody ForgotPasswordRequestDto forgotPasswordDto,
            HttpServletRequest request) {
        String userAgent = request.getHeader(HttpHeaders.USER_AGENT);
        String ipAddress = request.getRemoteAddr();
        authService.requestForgotPassword(forgotPasswordDto, ipAddress, userAgent);
        return ResponseEntity
                .ok(Map.of("message", "If the email matches an active account, a password reset link has been sent."));
    }

    /**
     * Verifies recovery token authenticity and updates the user's password.
     */
    @PostMapping("/reset-password")
    public ResponseEntity<Map<String, String>> resetPassword(
            @Valid @RequestBody ResetPasswordRequestDto resetPasswordDto) {
        authService.resetPassword(resetPasswordDto);
        return ResponseEntity.ok(Map.of("message", "Password has been reset successfully."));
    }

    /**
     * Fetches details of the currently authenticated active user session.
     */
    @GetMapping("/me")
    public ResponseEntity<UserResponseDto> getProfile(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(401).build();
        }
        UserDetails userPrincipal = (UserDetails) authentication.getPrincipal();
        UserResponseDto profile = authService.getCurrentUserProfile(userPrincipal.getUsername());
        return ResponseEntity.ok(profile);
    }

    /**
     * Writes a secure, HttpOnly, SameSite cookie to the servlet HTTP response
     * headers.
     * The cookie is restricted to "/api/v1/auth/refresh" to minimize path exposure.
     */
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

    /**
     * Overwrites and deletes the client's refresh token cookie by setting maxAge =
     * 0.
     */
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

    /**
     * Helper to read the refresh token value from request Cookie headers.
     */
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
