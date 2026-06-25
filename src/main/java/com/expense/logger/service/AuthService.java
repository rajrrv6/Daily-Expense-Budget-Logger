package com.expense.logger.service;

import com.expense.logger.dto.AuthResponseDto;
import com.expense.logger.dto.UserLoginRequestDto;
import com.expense.logger.dto.UserRegisterRequestDto;
import com.expense.logger.dto.UserResponseDto;

public interface AuthService {
    AuthResponseDto registerUser(UserRegisterRequestDto registerDto);
    AuthResponseDto loginUser(UserLoginRequestDto loginDto, String userAgent, String ipAddress);
    AuthResponseDto refreshSession(String refreshToken, String userAgent, String ipAddress);
    void logoutUser(String refreshToken);
    UserResponseDto getCurrentUserProfile(String username);
    void requestForgotPassword(com.expense.logger.dto.ForgotPasswordRequestDto requestDto, String ipAddress, String userAgent);
    void resetPassword(com.expense.logger.dto.ResetPasswordRequestDto requestDto);
    AuthResponseDto verifyOtp(com.expense.logger.dto.OtpVerificationRequestDto verifyDto, String userAgent, String ipAddress);
    void resendOtp(com.expense.logger.dto.OtpResendRequestDto resendDto);
}
