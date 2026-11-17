package com.daily_note_dms.documents.dto;

public record PreSignedUrlResponse(
    String videoId,
    String uploadUrl,
    String s3Key
) {}