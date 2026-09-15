package com.daily_notes.notes.service;

import com.daily_notes.notes.dao.ShortNoteDao;
import com.daily_notes.notes.dto.CreateShortNoteDto;
import com.daily_notes.notes.entity.ShortNoteEntity;
import com.daily_notes.notes.mapper.CustomMapper;
import com.daily_notes.notes.records.ApiResponse;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.enhanced.dynamodb.model.Page;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;

import java.util.UUID;
import java.util.Map;

@Service
public class ShortNoteServiceImpl implements ShortNoteService {

    private final ShortNoteDao shortNoteDao;

    public ShortNoteServiceImpl(ShortNoteDao shortNoteDao) {
        this.shortNoteDao = shortNoteDao;
    }

    @Override
    public ApiResponse createShortNote(CreateShortNoteDto createShortNoteDto) {
        ShortNoteEntity entity = CustomMapper
                .mapToEntity(createShortNoteDto,
                        ShortNoteEntity.class);
        entity.setId(UUID.randomUUID().toString());
        shortNoteDao
                .createShortNote(entity);

        return new ApiResponse()
                .success(Boolean.TRUE)
                .message("Success");
    }

    @Override
    public ApiResponse getAllShortNotes(
            String categoryId1,
            String userId,
            Integer limit,
            Map<String, AttributeValue> attributeValueMap) {

        Page<ShortNoteEntity> sdkPage =
                shortNoteDao.getAllShortNotes(
                        userId,
                        limit,
                        attributeValueMap
                );

        return new ApiResponse()
                .data(sdkPage.items())
                .message("Success")
                .success(Boolean.TRUE);
    }

    @Override
    public ApiResponse deleteShortNoteById(String category, String userId, String noteId) {
        shortNoteDao.deleteShortNoteById(category, userId, noteId);
        return new ApiResponse().success(true);
    }
}
