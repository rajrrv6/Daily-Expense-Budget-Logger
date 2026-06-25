package com.expense.logger.service;

import com.expense.logger.dto.CategoryRequestDto;
import com.expense.logger.dto.CategoryResponseDto;

import java.util.List;

public interface CategoryService {
    List<CategoryResponseDto> getAllCategories();
    CategoryResponseDto createCategory(CategoryRequestDto categoryRequestDto);
}
