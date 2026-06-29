package com.expense.logger.service;

import com.expense.logger.exception.BadRequestException;
import com.expense.logger.exception.ResourceNotFoundException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

@Service
@Slf4j
public class AvatarStorageServiceImpl implements AvatarStorageService {

    private final Path fileStorageLocation;

    public AvatarStorageServiceImpl() {
        this.fileStorageLocation = Paths.get(System.getProperty("user.dir"), "uploads", "avatars")
                .toAbsolutePath().normalize();
        try {
            Files.createDirectories(this.fileStorageLocation);
            log.info("Avatar storage directory initialized at: {}", this.fileStorageLocation);
        } catch (IOException ex) {
            log.error("Could not create the directory where the uploaded avatars will be stored.", ex);
            throw new RuntimeException("Could not create avatar upload directory", ex);
        }
    }

    @Override
    public String storeFile(MultipartFile file) {
        if (file.isEmpty()) {
            throw new BadRequestException("Cannot upload an empty file");
        }

        // Validate File Size (2MB for avatars)
        if (file.getSize() > 2 * 1024 * 1024) {
            throw new BadRequestException("File size exceeds the maximum limit of 2MB");
        }

        // Validate File Format/Content Type
        String contentType = file.getContentType();
        String originalFileName = file.getOriginalFilename();
        if (originalFileName == null) {
            throw new BadRequestException("Filename is invalid");
        }

        String extension = "";
        int i = originalFileName.lastIndexOf('.');
        if (i > 0) {
            extension = originalFileName.substring(i + 1).toLowerCase();
        }

        // Check extension (avatars: jpg, jpeg, png)
        if (!extension.equals("jpg") && !extension.equals("jpeg") && !extension.equals("png")) {
            throw new BadRequestException("Invalid file extension. Only JPG, JPEG, and PNG files are allowed.");
        }

        // Check MIME type if present
        if (contentType != null) {
            String mime = contentType.toLowerCase();
            if (!mime.equals("image/png") && 
                !mime.equals("image/jpeg") && 
                !mime.equals("image/jpg") && 
                !mime.equals("image/pjpeg")) {
                throw new BadRequestException("Invalid file type. Only PNG, JPG, and JPEG images are allowed.");
            }
        }

        try {
            // Normalize file name and generate a unique storage name
            String cleanedFileName = originalFileName.replaceAll("[^a-zA-Z0-9\\.\\-]", "_");
            String fileName = UUID.randomUUID().toString() + "_" + cleanedFileName;

            // Copy file to the target location
            Path targetLocation = this.fileStorageLocation.resolve(fileName);
            Files.copy(file.getInputStream(), targetLocation, StandardCopyOption.REPLACE_EXISTING);

            log.info("Stored avatar file {} successfully at {}", fileName, targetLocation);
            return fileName;
        } catch (IOException ex) {
            log.error("Failed to store avatar file {}", originalFileName, ex);
            throw new RuntimeException("Could not store avatar file. Please try again!", ex);
        }
    }

    @Override
    public Resource loadFileAsResource(String filename) {
        try {
            Path filePath = this.fileStorageLocation.resolve(filename).normalize();
            
            // Path traversal guard
            if (!filePath.startsWith(this.fileStorageLocation)) {
                log.warn("Path traversal warning: file={} resolved outside storage directory", filename);
                throw new BadRequestException("Invalid file path request");
            }
            
            Resource resource = new UrlResource(filePath.toUri());
            if (resource.exists() && resource.isReadable()) {
                return resource;
            } else {
                throw new ResourceNotFoundException("Avatar file not found: " + filename);
            }
        } catch (MalformedURLException ex) {
            throw new ResourceNotFoundException("Avatar file not found: " + filename);
        }
    }

    @Override
    public void deleteFile(String filename) {
        if (filename == null || filename.isBlank()) {
            return;
        }
        try {
            Path filePath = this.fileStorageLocation.resolve(filename).normalize();
            
            // Path traversal guard
            if (!filePath.startsWith(this.fileStorageLocation)) {
                log.warn("Path traversal warning on delete: file={} resolved outside storage directory", filename);
                return;
            }
            
            boolean deleted = Files.deleteIfExists(filePath);
            if (deleted) {
                log.info("Deleted avatar file {} successfully", filename);
            } else {
                log.warn("Attempted to delete avatar file {} but it did not exist", filename);
            }
        } catch (IOException ex) {
            log.error("Failed to delete avatar file {}", filename, ex);
        }
    }
}
