package com.expense.logger.service;

import com.expense.logger.dto.UserPasswordUpdateRequestDto;
import com.expense.logger.dto.UserProfileUpdateRequestDto;
import com.expense.logger.dto.UserResponseDto;
import com.expense.logger.dto.AuditLogResponseDto;
import com.expense.logger.dto.PagedResponseDto;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.UUID;

public interface UserService {
    UserResponseDto updateProfile(UUID userId, UserProfileUpdateRequestDto dto);
    void updatePassword(UUID userId, UserPasswordUpdateRequestDto dto);
    UserResponseDto uploadProfilePicture(UUID userId, org.springframework.web.multipart.MultipartFile file);
    PagedResponseDto<UserResponseDto> getAllUsers(String role, String status, String search, Pageable pageable);
    UserResponseDto updateUserRole(UUID userId, String roleName, UUID adminId);
    UserResponseDto toggleUserLock(UUID userId, UUID adminId);
    PagedResponseDto<AuditLogResponseDto> getAuditLogs(String actionType, String search, Pageable pageable);
}
