package com.expense.logger.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BulkUploadRowDto {
    private int rowNumber;
    private String name;
    private String categoryName;
    private BigDecimal amount;
    private String transactionDate;
    private String receipt;
    private boolean newCategory;
    private boolean valid;
    private boolean duplicate;
    private String errorMessage;
}
