package com.daily_notes.notes.dao;

import com.daily_notes.notes.entity.ShortNoteEntity;
import software.amazon.awssdk.enhanced.dynamodb.model.Page;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;

import java.util.Map;

public interface ShortNoteDao {

    void createShortNote(ShortNoteEntity shortNoteEntity);

    //List<ShortNoteEntity> getAllShortNotes(String categoryId, String userId);

    Page<ShortNoteEntity> getAllShortNotes(
            String userId,
            int limit,
            Map<String, AttributeValue> lastEvaluatedKey);

    void deleteShortNoteById(String userId, String noteId, String id);
}
