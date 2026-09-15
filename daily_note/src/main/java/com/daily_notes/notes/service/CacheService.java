package com.daily_notes.notes.service;

import com.daily_notes.notes.records.ApiResponse;
import org.springframework.stereotype.Service;

@Service
public interface CacheService {

    ApiResponse save(String key, Object value);


}
