package com.daily_note_dms.documents.service;

import com.daily_note_dms.documents.dto.ApiResponse;
import com.daily_note_dms.documents.dto.DocumentDto;

public interface FileService {
    ApiResponse createFileUploadPresignedURL(String noteId, DocumentDto documentDto);

    ApiResponse getAllDocumentByNoteId(String noteId);
}
