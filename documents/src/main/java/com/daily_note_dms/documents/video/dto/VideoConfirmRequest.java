package com.daily_note_dms.documents.video.dto;

public record VideoConfirmRequest(
    Long fileSizeBytes,
    Integer durationSeconds
) {}