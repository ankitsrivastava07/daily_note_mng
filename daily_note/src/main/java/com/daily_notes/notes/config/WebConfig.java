package com.daily_notes.notes.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    private RateLimiterHandlerInterceptor rateLimiterHandlerInterceptor;

    public WebConfig(RateLimiterHandlerInterceptor rateLimiterHandlerInterceptor) {
        this.rateLimiterHandlerInterceptor = rateLimiterHandlerInterceptor;
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(rateLimiterHandlerInterceptor)
                .addPathPatterns("/api/**");
    }


}
