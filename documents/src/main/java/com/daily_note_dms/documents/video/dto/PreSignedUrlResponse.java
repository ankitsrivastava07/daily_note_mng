package com.daily_note_dms.documents.video.dto;

public record PreSignedUrlResponse(
        String videoId,
        String uploadUrl,
        String s3Key
) {
}