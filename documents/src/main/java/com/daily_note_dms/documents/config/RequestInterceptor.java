package com.daily_note_dms.documents.config;

import io.github.bucket4j.Bucket;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
public class RequestInterceptor implements HandlerInterceptor {

    private Bucket bucket;

    @Override
    public boolean preHandle(HttpServletRequest req, HttpServletResponse res, Object handler) throws Exception {

        if (bucket.tryConsume(1))
            return true;

        res.getWriter().println("429 Too Many Requests");
        res.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
        return false;
    }
}
