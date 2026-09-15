package com.daily_notes.notes.service;

import com.daily_notes.notes.dto.PreSignedUrlDto;

import java.util.Map;

public interface FileService {

    Map<String, Object> createPresignedUrl(PreSignedUrlDto dto);
}
