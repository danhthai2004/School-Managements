package com.schoolmanagement.backend.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;

import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;

@Slf4j
@Configuration
public class FirebaseConfig {

    @Value("${firebase.config.path:}")
    private String firebaseConfigPath;

    @PostConstruct
    public void initialize() {
        try {
            if (FirebaseApp.getApps().isEmpty()) {
                GoogleCredentials credentials;

                if (firebaseConfigPath != null && !firebaseConfigPath.isBlank()) {
                    // Ưu tiên file path bên ngoài (production)
                    credentials = GoogleCredentials.fromStream(new FileInputStream(firebaseConfigPath));
                    log.info("🔥 Khởi tạo Firebase Admin SDK bằng file config: {}", firebaseConfigPath);
                } else {
                    // Fallback: đọc từ classpath (dev)
                    InputStream serviceAccount = new ClassPathResource("firebase-service-account.json").getInputStream();
                    credentials = GoogleCredentials.fromStream(serviceAccount);
                    log.info("🔥 Khởi tạo Firebase Admin SDK bằng classpath resource.");
                }

                FirebaseOptions options = FirebaseOptions.builder()
                        .setCredentials(credentials)
                        .build();

                FirebaseApp.initializeApp(options);
                log.info("✅ Firebase Admin SDK đã được khởi tạo thành công.");
            }
        } catch (IOException e) {
            log.warn("⚠️ Không thể khởi tạo Firebase Admin SDK (Push notification sẽ không hoạt động): {}", e.getMessage());
        }
    }
}
