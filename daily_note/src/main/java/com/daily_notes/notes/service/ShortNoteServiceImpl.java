package com.daily_notes.notes.service;

import com.daily_notes.notes.dao.ShortNoteDao;
import com.daily_notes.notes.dto.CreateShortNoteDto;
import com.daily_notes.notes.entity.ShortNoteEntity;
import com.daily_notes.notes.exceptions.exception.ShortEntityAlreadyExistException;
import com.daily_notes.notes.mapper.CustomMapper;
import com.daily_notes.notes.records.ApiResponse;
import com.daily_notes.notes.utility.constant.TokenUtil;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.enhanced.dynamodb.model.Page;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;

import java.util.Locale;
import java.util.Objects;
import java.util.UUID;
import java.util.Map;

@Service
public class ShortNoteServiceImpl implements ShortNoteService {

    private final ShortNoteDao shortNoteDao;
    private final Logger logger = LoggerFactory.getLogger(ShortNoteServiceImpl.class);

    public ShortNoteServiceImpl(ShortNoteDao shortNoteDao) {
        this.shortNoteDao = shortNoteDao;
    }

    @Override
    public ApiResponse createShortNote(CreateShortNoteDto createShortNoteDto) throws Exception {
        logger.info("Creating short note: {}", createShortNoteDto);
        ShortNoteEntity entity = CustomMapper.mapToEntity(createShortNoteDto, ShortNoteEntity.class);
        entity.setId(UUID.randomUUID().toString());
        String token = TokenUtil.generateToken(createShortNoteDto.userId(), createShortNoteDto.title());
        if ((entity = shortNoteDao.findByHashToken(createShortNoteDto.userId(), token)) != null) {
            logger.info(
                    "Duplicate short note title detected for userId: {} and title: {}",
                    createShortNoteDto.userId(),
                    createShortNoteDto.title()
            );
            throw new ShortEntityAlreadyExistException("You already have a short note with " +
                    "this title in your account. Please choose a different title.");
        }
        entity.setUniqueToken(token);
        shortNoteDao.createShortNote(entity);
        return new
                ApiResponse().
                success(Boolean.TRUE).
                message("Success");
    }

    @Override
    public Page<ShortNoteEntity> getAllShortNotes(String categoryId1, String userId, Integer limit, Map<String, AttributeValue> attributeValueMap) {
        logger.info("Fetching all short notes for userId: {}, " +
                "categoryId: {}, limit: {}, " +
                "attributeValueMap: {}", userId, categoryId1, limit, attributeValueMap);
        return shortNoteDao.getAllShortNotes(userId, limit, attributeValueMap);

    }

    @Override
    public ApiResponse deleteShortNoteById(String category, String userId, String noteId) {
        logger.info("Deleting short note with noteId: {}, userId: {}, category: {}", noteId, userId, category);
        shortNoteDao.deleteShortNoteById(category, userId, noteId);
        return new ApiResponse().success(true);
    }
}
