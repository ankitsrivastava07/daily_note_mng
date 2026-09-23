package com.daily_note_dms.documents.service;

import com.daily_note_dms.documents.dto.ApiResponse;
import com.daily_note_dms.documents.dto.CreatePresignedUrlRequest;

public interface S3Service {

    ApiResponse generateUploadUrl(CreatePresignedUrlRequest request);
}
