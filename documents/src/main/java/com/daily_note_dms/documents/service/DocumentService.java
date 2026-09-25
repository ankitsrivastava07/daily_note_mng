package com.daily_note_dms.documents.service;

import com.daily_note_dms.documents.dto.ApiResponse;
import com.daily_note_dms.documents.dto.DocumentDto;

import java.util.List;

public interface DocumentService {
    ApiResponse saveDocument(String noteId, List<DocumentDto> documentDtos);

    ApiResponse getAllDocumentByNoteId(String noteId);

    ApiResponse getPresignedURL(String referenceId, List<String> fileName);
}
