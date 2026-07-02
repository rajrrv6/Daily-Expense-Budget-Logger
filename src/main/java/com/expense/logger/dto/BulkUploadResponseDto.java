package com.expense.logger.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BulkUploadResponseDto {
    private int totalRows;
    private int successCount;
    private int failedCount;
    private int duplicateCount;
    private int newCategoriesCount;
    private List<BulkUploadRowDto> rows;
    private List<Map<String, Object>> errors;
}
