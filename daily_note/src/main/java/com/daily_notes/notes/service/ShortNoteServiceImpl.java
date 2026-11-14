package com.daily_notes.notes.service;

import com.daily_notes.notes.dao.ShortNoteDao;
import com.daily_notes.notes.dto.CreateShortNoteDto;
import com.daily_notes.notes.dto.ShortNoteDto;
import com.daily_notes.notes.entity.ShortNoteEntity;
import com.daily_notes.notes.exceptions.exception.ShortEntityAlreadyExistException;
import com.daily_notes.notes.mapper.CustomMapper;
import com.daily_notes.notes.records.ApiResponse;
import com.daily_notes.notes.utility.constant.TokenUtil;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.enhanced.dynamodb.model.Page;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;

import java.time.Instant;
import java.util.Map;

@Service
public class ShortNoteServiceImpl implements ShortNoteService {

    private final ShortNoteDao shortNoteDao;
    private final Logger logger = LoggerFactory.getLogger(ShortNoteServiceImpl.class);
    @Value("${aws.s3.bucket-name}")
    private String bucketName;

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
    public ApiResponse getShortNoteById(String userId, String shortNoteId) {

        logger.info("Fetching short note with shortNoteId: {}, userId: {}", shortNoteId, userId);
        ShortNoteEntity shortNote =
                shortNoteDao.getShortNoteById(userId, shortNoteId);
        ApiResponse apiResponse;
       /* try {
            logger.info("Retrieved short note: {}", shortNote);
            apiResponse = dmsFeignClient
                    .getAllDocumentsByShortNoteId(shortNoteId)
                    .getBody();

            logger.info("Retrieved short note: {}", apiResponse);
        } catch (FeignException.BadGateway e) {
            logger.error("Error while fetching documents for short note ID: {}", shortNoteId, e);
            return new ApiResponse()
                    .success(Boolean.FALSE)
                    .message("We couldn't load the documents right now. Please try again shortly.")
                    .error("Service temporarily unavailable");
        }*/

        if (shortNote == null) {
            return new ApiResponse()
                    .success(Boolean.FALSE)
                    .message("Short note not found")
                    .error("No record found for ID: " + shortNoteId);
        }

        ShortNoteDto shortNoteDto = new ShortNoteDto();
        shortNoteDto.setPath(bucketName + "/" + shortNote.getId());
        shortNoteDto.setContent(shortNote.getContent());
        shortNoteDto.setTitle(shortNote.getTitle());
        shortNoteDto.setCreatedAt(shortNote.getCreatedAt());
        //shortNoteDto.setDownloadUrl((List<String>) apiResponse.data());

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
