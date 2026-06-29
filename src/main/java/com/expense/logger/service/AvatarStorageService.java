package com.expense.logger.service;

import org.springframework.core.io.Resource;
import org.springframework.web.multipart.MultipartFile;

public interface AvatarStorageService {
    String storeFile(MultipartFile file);
    Resource loadFileAsResource(String filename);
    void deleteFile(String filename);
}
