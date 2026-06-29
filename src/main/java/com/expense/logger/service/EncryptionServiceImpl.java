package com.expense.logger.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Base64;

@Service
@Slf4j
public class EncryptionServiceImpl implements EncryptionService {

    private static final String ALGORITHM = "AES/GCM/NoPadding";
    private static final int GCM_IV_LENGTH = 12; // 96-bit IV recommended for GCM
    private static final int GCM_TAG_LENGTH = 128; // 128-bit authentication tag

    private final SecretKeySpec secretKey;

    public EncryptionServiceImpl(@Value("${app.encryption.key}") String base64Key) {
        try {
            byte[] decodedKey = Base64.getDecoder().decode(base64Key.trim());
            if (decodedKey.length != 32) {
                throw new IllegalArgumentException("Encryption key must be exactly 32 bytes (256 bits) long for AES-256.");
            }
            this.secretKey = new SecretKeySpec(decodedKey, "AES");
        } catch (Exception e) {
            throw new IllegalStateException("Failed to initialize EncryptionService. Invalid key configured.", e);
        }
    }

    @Override
    public String encrypt(String plainText) {
        if (plainText == null) {
            return null;
        }
        try {
            byte[] iv = new byte[GCM_IV_LENGTH];
            SecureRandom random = new SecureRandom();
            random.nextBytes(iv);

            Cipher cipher = Cipher.getInstance(ALGORITHM);
            GCMParameterSpec parameterSpec = new GCMParameterSpec(GCM_TAG_LENGTH, iv);
            cipher.init(Cipher.ENCRYPT_MODE, secretKey, parameterSpec);

            byte[] cipherTextBytes = cipher.doFinal(plainText.getBytes(StandardCharsets.UTF_8));

            // Combine IV and CipherText
            byte[] encrypted = new byte[GCM_IV_LENGTH + cipherTextBytes.length];
            System.arraycopy(iv, 0, encrypted, 0, GCM_IV_LENGTH);
            System.arraycopy(cipherTextBytes, 0, encrypted, GCM_IV_LENGTH, cipherTextBytes.length);

            return Base64.getEncoder().encodeToString(encrypted);
        } catch (Exception e) {
            throw new RuntimeException("Encryption failed", e);
        }
    }

    @Override
    public String decrypt(String cipherText) {
        if (cipherText == null) {
            return null;
        }
        try {
            // Quick check: plaintext phone numbers (e.g. "1234567890" or "+1-234-567-890") are not valid base64 encrypted data.
            // Decrypted structure has minimum 28 bytes (12 bytes IV + 16 bytes authentication tag).
            // A 28-byte array base64-encodes to 38+ characters.
            if (cipherText.trim().length() < 38) {
                return cipherText;
            }

            byte[] encrypted;
            try {
                encrypted = Base64.getDecoder().decode(cipherText.trim());
            } catch (IllegalArgumentException e) {
                // Not valid Base64, returning as plaintext
                return cipherText;
            }

            if (encrypted.length < GCM_IV_LENGTH) {
                return cipherText;
            }

            byte[] iv = new byte[GCM_IV_LENGTH];
            System.arraycopy(encrypted, 0, iv, 0, GCM_IV_LENGTH);

            int cipherTextLength = encrypted.length - GCM_IV_LENGTH;
            byte[] cipherTextBytes = new byte[cipherTextLength];
            System.arraycopy(encrypted, GCM_IV_LENGTH, cipherTextBytes, 0, cipherTextLength);

            Cipher cipher = Cipher.getInstance(ALGORITHM);
            GCMParameterSpec parameterSpec = new GCMParameterSpec(GCM_TAG_LENGTH, iv);
            cipher.init(Cipher.DECRYPT_MODE, secretKey, parameterSpec);

            byte[] plainTextBytes = cipher.doFinal(cipherTextBytes);
            return new String(plainTextBytes, StandardCharsets.UTF_8);
        } catch (Exception e) {
            log.warn("Decryption failed for value. Returning original value as plaintext. Reason: {}", e.getMessage());
            return cipherText;
        }
    }
}
