package com.daily_note_dms.documents.dto;

public record VideoConfirmRequest(
    Long fileSizeBytes,
    Integer durationSeconds
) {}