package com.expense.logger.service;

import com.expense.logger.dto.UserPasswordUpdateRequestDto;
import com.expense.logger.dto.UserProfileUpdateRequestDto;
import com.expense.logger.dto.UserResponseDto;

import java.util.UUID;

public interface UserService {
    UserResponseDto updateProfile(UUID userId, UserProfileUpdateRequestDto dto);
    void updatePassword(UUID userId, UserPasswordUpdateRequestDto dto);
}
