package com.daily_notes.notes.config;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;

@Configuration
public class RateLimiterConfig {

    @Bean
    public Bucket bandWidth() {
        Bandwidth bandwidth = Bandwidth.builder()
                .capacity(10)
                .refillGreedy(10, Duration.ofSeconds(30))
                .build();

        return Bucket.builder().addLimit(bandwidth).build();
    }
}


