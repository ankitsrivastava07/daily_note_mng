package com.daily_note.search_event_consumer.config;

import jakarta.annotation.PostConstruct;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;

import java.io.File;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.StandardCopyOption;

@Configuration
public class KafkaSslConfig {

    @PostConstruct
    public void init() throws Exception {
        ClassPathResource resource = new ClassPathResource("kafka-ca.pem");
        File tempFile = File.createTempFile("kafka-ca", ".pem");
        tempFile.deleteOnExit();

        try (InputStream inputStream = resource.getInputStream()) {
            Files.copy(inputStream, tempFile.toPath(), StandardCopyOption.REPLACE_EXISTING);
        }

        // Set the property so Kafka Consumer receives an absolute file path
        System.setProperty("spring.kafka.properties.ssl.truststore.location", tempFile.getAbsolutePath());
    }
}