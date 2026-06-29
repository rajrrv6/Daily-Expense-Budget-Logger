package com.expense.logger.service;

/**
 * Service interface for symmetric encryption and decryption operations.
 */
public interface EncryptionService {
    
    /**
     * Encrypts the provided plain text.
     * 
     * @param plainText The plaintext string to encrypt.
     * @return The Base64 encoded ciphertext including the IV, or null if input is null.
     */
    String encrypt(String plainText);

    /**
     * Decrypts the provided cipher text.
     * 
     * @param cipherText The Base64 encoded ciphertext to decrypt.
     * @return The decrypted plaintext string, or null if input is null.
     */
    String decrypt(String cipherText);
}
