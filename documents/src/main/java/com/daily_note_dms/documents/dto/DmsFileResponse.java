package com.daily_note_dms.documents.dto;

import java.time.Instant;

public record DmsFileResponse(
        String fileName,
        String s3Key,
        Long fileSize,
        String downloadUrl,
        Instant lastModified
) {}
