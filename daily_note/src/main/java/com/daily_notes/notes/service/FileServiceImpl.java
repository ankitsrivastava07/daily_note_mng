package com.daily_notes.notes.service;

import com.daily_notes.notes.dto.PreSignedUrlDto;
import org.springframework.stereotype.Service;
import java.util.Map;

@Service
public class FileServiceImpl implements FileService {

    @Override
    public Map<String, Object> createPresignedUrl(PreSignedUrlDto dto) {
        // Implementation for file upload

        return null;
    }
}
