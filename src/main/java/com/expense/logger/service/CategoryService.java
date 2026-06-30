package com.expense.logger.service;

import com.expense.logger.dto.CategoryRequestDto;
import com.expense.logger.dto.CategoryResponseDto;
import com.expense.logger.dto.CategoryDetailsDto;

import java.util.List;
import java.util.UUID;

public interface CategoryService {
    List<CategoryResponseDto> getAllCategories();
    CategoryResponseDto createCategory(CategoryRequestDto categoryRequestDto);
    CategoryResponseDto updateCategory(Long id, CategoryRequestDto categoryRequestDto);
    void deleteCategory(Long id);
    CategoryDetailsDto getCategoryDetails(Long id, UUID userId);
}
