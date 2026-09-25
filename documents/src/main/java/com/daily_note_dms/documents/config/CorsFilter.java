package com.daily_note_dms.documents.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Configuration
public class CorsFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain)
            throws ServletException, IOException {

        String origin = request.getHeader("Origin");

        if ("http://localhost:5173".equals(origin)
                || "https://main.d1dpqtfgo1oh1y.amplifyapp.com".equals(origin)) {

            response.setHeader("Access-Control-Allow-Origin", origin);
        }

        response.setHeader(
                "Access-Control-Allow-Methods",
                "GET, POST, PUT, DELETE, PATCH, OPTIONS"
        );

        response.setHeader(
                "Access-Control-Allow-Headers",
                "Content-Type, Authorization, userId, X-Request-Id"
        );

        response.setHeader(
                "Access-Control-Expose-Headers",
                "X-Request-Id"
        );

        response.setHeader(
                "Access-Control-Max-Age",
                "3600"
        );

        // Browser preflight request
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            response.setStatus(HttpServletResponse.SC_OK);
            return;
        }

        filterChain.doFilter(request, response);
    }
}

