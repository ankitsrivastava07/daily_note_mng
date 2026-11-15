package com.daily_notes.notes.service;

import com.daily_notes.notes.dao.ShortNoteDao;
import com.daily_notes.notes.dto.CreateShortNoteDto;
import com.daily_notes.notes.dto.ShortNoteDto;
import com.daily_notes.notes.dto.UpdateShortNoteDto;
import com.daily_notes.notes.entity.ShortNoteEntity;
import com.daily_notes.notes.exceptions.exception.ShortEntityAlreadyExistException;
import com.daily_notes.notes.exceptions.exception.ShortEntityNotFoundException;
import com.daily_notes.notes.mapper.CustomMapper;
import com.daily_notes.notes.records.ApiResponse;
import com.daily_notes.notes.utility.constant.TokenUtil;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;
import software.amazon.awssdk.enhanced.dynamodb.model.Page;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;

import java.time.Instant;
import java.util.*;

@Service
public class ShortNoteServiceImpl implements ShortNoteService {

    private final ShortNoteDao shortNoteDao;
    private final Logger logger = LoggerFactory.getLogger(ShortNoteServiceImpl.class);

    public ShortNoteServiceImpl(ShortNoteDao shortNoteDao) {
        this.shortNoteDao = shortNoteDao;
    }

    @Override
    public ApiResponse createShortNote(
            CreateShortNoteDto createShortNoteDto) throws Exception {
        logger.info("Creating short note for userId: {}",
                createShortNoteDto.userId());

        ShortNoteEntity entity =
                CustomMapper.mapToEntity(
                        createShortNoteDto,
                        ShortNoteEntity.class
                );

        // Always generate creation timestamp on backend
        Instant createdAt = Instant.now();
        entity.setCreatedAt(createdAt);
        entity.setUpdateAt(createdAt);
        entity.setAttachement(createShortNoteDto.attachement()); // Initialize attachment count
        String token = TokenUtil.generateToken(
                createShortNoteDto.userId(),
                createShortNoteDto.title()
        );

        if (shortNoteDao.findByHashToken(
                createShortNoteDto.userId(), token) != null) {
            throw new ShortEntityAlreadyExistException(
                    "You already have a short note with this title. " +
                            "Please choose a different title."
            );
        }

        entity.setUniqueToken(token);
        // Log exact information needed for future recovery
        logger.info(
                "SHORT_NOTE_CREATED userId={} noteId={} createdAt={}",
                entity.getUserId(),
                entity.getId(),
                entity.getCreatedAt()
        );

        entity = shortNoteDao.createShortNote(entity);

        return new ApiResponse()
                .success(Boolean.TRUE)
                .data(entity)
                .message("Success");
    }

    @Override
    public ApiResponse updateShortNote(
            UpdateShortNoteDto updateShortNoteDto) throws Exception {

        logger.info("Updating short note for userId: {}, noteId: {}",
                updateShortNoteDto.userId(),
                updateShortNoteDto.id());

        ShortNoteEntity entity = shortNoteDao.getShortNoteById(
                updateShortNoteDto.userId(),
                updateShortNoteDto.id()
        );

        if (entity == null) {
            throw new ShortEntityNotFoundException(
                    "Short note not found."
            );
        }

        // Update only user-editable fields
        entity.setCategoryId(updateShortNoteDto.categoryId());
        entity.setTitle(updateShortNoteDto.title());
        entity.setContent(updateShortNoteDto.content());

        entity.setUpdateAt(Instant.now());
        entity = shortNoteDao.updateShortNote(entity);

        logger.info(
                "SHORT_NOTE_UPDATED userId={} noteId={}",
                entity.getUserId(),
                entity.getId()
        );

        return new ApiResponse()
                .success(Boolean.TRUE)
                .data(entity)
                .message("Short note updated successfully");
    }

    @Override
    public ApiResponse getShortNoteById(String userId, String shortNoteId) {
        logger.info("Fetching short note with shortNoteId: {}, userId: {}", shortNoteId, userId);
        ShortNoteEntity shortNote =
                shortNoteDao.getShortNoteById(userId, shortNoteId);
        if (shortNote == null) {
            throw new ShortEntityNotFoundException("Short note not found.");
        }

        ShortNoteDto shortNoteDto = new ShortNoteDto();
        shortNoteDto.setContent(shortNote.getContent());
        shortNoteDto.setTitle(shortNote.getTitle());
        shortNoteDto.setCreatedAt(shortNote.getCreatedAt());
        if (shortNote.getAttachement() == null) {
            final RestTemplate restTemplate = new RestTemplate();

            var externalUrl = UriComponentsBuilder
                    .fromUriString("https://zgtu2eqrhio3lmkx3jssssvfbq0mgsip.lambda-url.ap-south-1.on.aws/api/v1/{id}/dms")
                    .buildAndExpand(shortNoteId)
                    .toUriString();

            // 1. Set Accept header to request JSON from the external API
            HttpHeaders headers = new HttpHeaders();
            headers.setAccept(Collections.singletonList(MediaType.APPLICATION_JSON));
            HttpEntity<Void> entity = new HttpEntity<>(headers);

            // 2. Call the external GET API and parse response as JsonNode
            Map<String, Object> response = restTemplate.exchange(
                    externalUrl,
                    HttpMethod.GET,
                    entity,
                    Map.class
            ).getBody();

            List<?> data = (List<?>) response.get("data");
            if (data.isEmpty()) {
                shortNoteDao.updateShortNoteField(shortNote.getId(), shortNote.getUserId(), 0);
            } else if (!data.isEmpty() && shortNote.getAttachement() == null) {
                shortNoteDao.updateShortNoteField(shortNote.getId(), shortNote.getUserId(), data.size());
            }
            shortNoteDto.setNumberOfAttachments(data.size());
        }
        return new ApiResponse()
                .success(Boolean.TRUE)
                .message("Short note fetched successfully")
                .data(shortNoteDto);
    }

    @Override
    public Page<ShortNoteEntity> getAllShortNotes(String userId, Integer limit, Map<String, AttributeValue> attributeValueMap) {
        logger.info("Fetching all short notes for userId: {}, " +
                "limit: {}, " +
                "attributeValueMap: {}", userId, limit, attributeValueMap);
        return shortNoteDao.getAllShortNotes(userId, limit, attributeValueMap);
    }

    @Override
    public ApiResponse deleteShortNoteById(String userId, String noteId) {
        logger.info("Deleting short note with noteId: {}, userId: {}", noteId, userId);
        shortNoteDao.deleteShortNoteById(userId, noteId);
        return new ApiResponse().success(Boolean.TRUE).message("Short note deleted successfully");
    }
}
