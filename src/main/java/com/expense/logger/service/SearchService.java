package com.expense.logger.service;

import com.expense.logger.dto.GlobalSearchResultDto;
import java.util.UUID;

public interface SearchService {
    GlobalSearchResultDto globalSearch(UUID userId, String query);
}
