package com.daily_notes.notes.service;

import com.daily_notes.notes.dto.CreateShortNoteDto;
import com.daily_notes.notes.entity.ShortNoteEntity;
import com.daily_notes.notes.records.ApiResponse;
import software.amazon.awssdk.enhanced.dynamodb.model.Page;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;

import java.util.Map;

public interface ShortNoteService {

    ApiResponse createShortNote(CreateShortNoteDto createShortNoteDto) throws Exception;

    Page<ShortNoteEntity> getAllShortNotes(String categoryId, String userId, Integer limit, Map<String, AttributeValue> attributeValueMap);

    ApiResponse deleteShortNoteById(String category, String userId, String noteId);
}
