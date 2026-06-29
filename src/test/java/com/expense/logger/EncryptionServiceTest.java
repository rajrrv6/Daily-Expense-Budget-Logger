package com.expense.logger;

import com.expense.logger.service.EncryptionService;
import com.expense.logger.service.EncryptionServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

public class EncryptionServiceTest {

    private EncryptionService encryptionService;
    // 32-byte Base64-encoded key
    private static final String TEST_KEY = "TkdWM2R5aHViV2xqYjJSNWNHVnlaVzUwWVhScGIyND0=";

    @BeforeEach
    public void setUp() {
        encryptionService = new EncryptionServiceImpl(TEST_KEY);
    }

    @Test
    public void testEncryptionAndDecryption() {
        String originalText = "Hello, World! Secure AES Encryption Test.";
        String cipherText = encryptionService.encrypt(originalText);
        
        assertNotNull(cipherText);
        assertNotEquals(originalText, cipherText);

        String decryptedText = encryptionService.decrypt(cipherText);
        assertEquals(originalText, decryptedText);
    }

    @Test
    public void testRandomizedCiphertext() {
        String originalText = "Constant message";
        String cipherText1 = encryptionService.encrypt(originalText);
        String cipherText2 = encryptionService.encrypt(originalText);

        assertNotNull(cipherText1);
        assertNotNull(cipherText2);
        // GCM mode should use a random IV, resulting in different ciphertexts
        assertNotEquals(cipherText1, cipherText2);

        // Both decrypt to the same original text
        assertEquals(originalText, encryptionService.decrypt(cipherText1));
        assertEquals(originalText, encryptionService.decrypt(cipherText2));
    }

    @Test
    public void testNullHandling() {
        assertNull(encryptionService.encrypt(null));
        assertNull(encryptionService.decrypt(null));
    }

    @Test
    public void testInvalidKeyInitialization() {
        // Too short key
        assertThrows(IllegalStateException.class, () -> new EncryptionServiceImpl("dG9vLXNob3J0LWtleQ=="));
    }
}
