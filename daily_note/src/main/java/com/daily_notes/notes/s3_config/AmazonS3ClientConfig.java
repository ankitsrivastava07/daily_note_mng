package com.daily_notes.notes.s3_config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.services.s3.S3Client;

@Configuration
public class AmazonS3ClientConfig {

    @Bean
    public S3Client amazonS3Client() {
        return S3Client.builder().build();
    }

}
