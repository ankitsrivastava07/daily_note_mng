package com.daily_notes.notes.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.*;

@Component
public class HeaderNormalizationFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        
        HttpServletRequest wrappedRequest = new HttpServletRequestWrapper(request) {
            // A case-insensitive map that stores all incoming headers as-is
            private final Map<String, List<String>> headerMap = new TreeMap<>(String.CASE_INSENSITIVE_ORDER);

            {
                Enumeration<String> headerNames = request.getHeaderNames();
                if (headerNames != null) {
                    while (headerNames.hasMoreElements()) {
                        String key = headerNames.nextElement();
                        List<String> values = Collections.list(request.getHeaders(key));
                        headerMap.put(key, values);
                    }
                }
            }

            @Override
            public String getHeader(String name) {
                List<String> values = headerMap.get(name);
                if (values != null && !values.isEmpty()) {
                    return values.get(0);
                }
                return super.getHeader(name);
            }

            @Override
            public Enumeration<String> getHeaders(String name) {
                List<String> values = headerMap.get(name);
                if (values != null) {
                    return Collections.enumeration(values);
                }
                return super.getHeaders(name);
            }

            @Override
            public Enumeration<String> getHeaderNames() {
                return Collections.enumeration(headerMap.keySet());
            }
        };

        filterChain.doFilter(wrappedRequest, response);
    }
}