package com.daily_note_dms.documents.dto;

public record CreatePresignedUrlRequest(

        String fileName,
        String contentType,
        Long size,
        String noteId

) {
}
