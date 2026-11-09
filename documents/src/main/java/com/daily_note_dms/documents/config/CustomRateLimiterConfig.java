package com.daily_note_dms.documents.config;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;

@Configuration
public class CustomRateLimiterConfig {
    @Bean
    public Bucket bucketConfig() {
        Bandwidth bandwidth = Bandwidth
                .builder()
                .capacity(20)
                .refillGreedy(20, Duration.ofSeconds(10))
                .build();

        return Bucket
                .builder()
                .addLimit(bandwidth)
                .build();
    }
}
