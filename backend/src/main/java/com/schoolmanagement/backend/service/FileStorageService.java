package com.schoolmanagement.backend.service;

import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;

public interface FileStorageService {
    /**
     * Upload an file to the storage service.
     * 
     * @param file       the MultipartFile to upload.
     * @param folderName the folder in which to store the image/file
     * @return the public secure URL of the uploaded image.
     */
    String uploadFile(MultipartFile file, String folderName) throws IOException;

    /**
     * Delete an file from the storage service.
     * 
     * @param publicId the public ID of the image to delete.
     * @return true if successful, false otherwise.
     */
    boolean deleteFile(String publicId) throws IOException;
}
