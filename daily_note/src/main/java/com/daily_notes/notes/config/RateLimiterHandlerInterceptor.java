package com.daily_notes.notes.config;

import io.github.bucket4j.Bucket;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.io.IOException;

@Component
public class RateLimiterHandlerInterceptor implements HandlerInterceptor {

    private Bucket bucket;

    public RateLimiterHandlerInterceptor(Bucket bucket) {
        this.bucket = bucket;
    }

    @Override
    public boolean preHandle(HttpServletRequest req, HttpServletResponse res, Object handler) throws IOException {
        if (bucket.tryConsume(1)) {
            return true;
        }

        res.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
        res.getWriter().println("429 Too many requests.");
        return false;
    }

}
