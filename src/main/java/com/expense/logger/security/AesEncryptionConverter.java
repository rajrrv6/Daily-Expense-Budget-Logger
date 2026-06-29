package com.expense.logger.security;

import com.expense.logger.service.EncryptionService;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Component;

/**
 * JPA Attribute Converter that transparently encrypts and decrypts entity fields
 * using AES-256 GCM encryption via the EncryptionService.
 */
@Converter
@Component
public class AesEncryptionConverter implements AttributeConverter<String, String> {

    private final EncryptionService encryptionService;

    @Autowired
    public AesEncryptionConverter(@Lazy EncryptionService encryptionService) {
        this.encryptionService = encryptionService;
    }

    @Override
    public String convertToDatabaseColumn(String attribute) {
        if (attribute == null) {
            return null;
        }
        return encryptionService.encrypt(attribute);
    }

    @Override
    public String convertToEntityAttribute(String dbData) {
        if (dbData == null) {
            return null;
        }
        return encryptionService.decrypt(dbData);
    }
}
