package com.daily_note_dms.documents.video.service;

import com.daily_note_dms.documents.dto.PreSignedUrlResponse;
import com.daily_note_dms.documents.dto.VideoUploadRequest;
import com.daily_note_dms.documents.globalExceptionHandler.exception.VideoNotFoundException;
import com.daily_note_dms.documents.video.entity.VideoRecording;
import com.daily_note_dms.documents.video.repo.VideoRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.*;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedGetObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedPutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;

import java.time.Duration;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class VideoStorageService {

    private final S3Presigner s3Presigner;
    private final VideoRepository videoRepository;
    private final Logger logger = LoggerFactory.getLogger(VideoStorageService.class);
    private final S3Client s3Client;

    @Value("${aws.s3.bucket-name}")
    private String bucketName;

    public VideoStorageService(S3Presigner s3Presigner, VideoRepository videoRepository, S3Client s3Client) {
        this.s3Presigner = s3Presigner;
        this.videoRepository = videoRepository;
        this.s3Client = s3Client;
    }

    public PreSignedUrlResponse initiateVideoUpload(VideoUploadRequest req) {
        logger.info("Initiating Video Upload Request for user: {}", req.getUserId());

        String videoId = UUID.randomUUID().toString();
        // S3 path structure with userId
        String s3Key = String.format("video_recordings/%s/%s/%s.webm", req.getUserId(), req.getReferenceId(), videoId);

        // 1. Save initial PENDING record in DynamoDB
        VideoRecording entity = new VideoRecording();
        entity.setId(videoId);
        entity.setReferenceId(req.getReferenceId());
        entity.setUserId(req.getUserId());
        entity.setS3Key(s3Key);
        entity.setMimeType(req.getMimeType());
        entity.setStatus("PENDING");
        videoRepository.save(entity);

        logger.info("Saved PENDING record in DB with videoId: {}", videoId);

        // 2. Generate 15-min PUT Pre-signed URL (matching Content-Type)
        PutObjectRequest objectRequest = PutObjectRequest.builder()
                .bucket(bucketName)
                .key(s3Key)
                .contentType(req.getMimeType())
                .build();

        PutObjectPresignRequest presignRequest = PutObjectPresignRequest.builder()
                .signatureDuration(Duration.ofMinutes(15))
                .putObjectRequest(objectRequest)
                .build();

        PresignedPutObjectRequest presignedRequest = s3Presigner.presignPutObject(presignRequest);

        return new PreSignedUrlResponse(videoId, presignedRequest.url().toString(), s3Key);
    }

    public String getPresignedViewUrl(String s3Key) {
        GetObjectRequest getObjectRequest = GetObjectRequest.builder()
                .bucket(bucketName)
                .key(s3Key)
                .build();

        GetObjectPresignRequest presignRequest = GetObjectPresignRequest.builder()
                .signatureDuration(Duration.ofMinutes(15))
                .getObjectRequest(getObjectRequest)
                .build();

        PresignedGetObjectRequest presignedRequest = s3Presigner.presignGetObject(presignRequest);
        return presignedRequest.url().toString();
    }

    public void markUploadComplete(String videoId, Long fileSize, Integer duration, String userId) {
        logger.info("Marking Video Upload Complete: {}", videoId);
        VideoRecording entity = Optional.ofNullable(videoRepository.findById(userId, videoId))
                .orElseThrow(() -> new VideoNotFoundException("Video record not found"));
        logger.info("Marking Video Upload Complete: {}", videoId);
        entity.setFileSizeBytes(fileSize);
        entity.setDurationSeconds(duration);
        entity.setStatus("READY");
        videoRepository.save(entity);
    }

    public String generatePlaybackUrl(String videoId, String userId) {
        logger.info("Generating Playback Url for Video: {}", videoId);
        VideoRecording entity = Optional.ofNullable(videoRepository.findById(userId, videoId))
                .orElseThrow(() -> new VideoNotFoundException("Video not found"));

        String keyToSign = entity.getS3Key();

        if (keyToSign == null || keyToSign.isBlank()) {
            throw new VideoNotFoundException("S3 key missing for videoId: " + videoId);
        }

        // Agar s3Key ek folder prefix hai (chunked recording), toh pehla part_ object uthao
        if (keyToSign.endsWith("/")) {
            ListObjectsV2Response listRes = s3Client.listObjectsV2(
                    ListObjectsV2Request.builder()
                            .bucket(bucketName)
                            .prefix(keyToSign)
                            .build()
            );

            keyToSign = listRes.contents().stream()
                    .map(S3Object::key)
                    .filter(k -> k.contains("/part_"))
                    .sorted()
                    .findFirst()
                    .orElseThrow(() -> new VideoNotFoundException("No video chunks found under prefix: " + entity.getS3Key()));
        }

        logger.info("Generating presigned GET URL for videoId: {} with S3 key: {}", videoId, keyToSign);

        GetObjectRequest getObjectRequest = GetObjectRequest.builder()
                .bucket(bucketName)
                .key(keyToSign)
                .build();

        GetObjectPresignRequest presignRequest = GetObjectPresignRequest.builder()
                .signatureDuration(Duration.ofMinutes(15))
                .getObjectRequest(getObjectRequest)
                .build();

        return s3Presigner.presignGetObject(presignRequest).url().toString();
    }

    public List<VideoRecording> findByUserId(String userId) {
        return videoRepository.findByUserId(userId);
    }

    public void save(VideoRecording record) {
        videoRepository.save(record);
    }

    public VideoRecording findById(String id, String userId) {
        VideoRecording entity = videoRepository.findById(userId, id);
        if (entity == null) {
            return null;
        }
        if (userId != null && !userId.isBlank()
                && entity.getUserId() != null
                && !userId.equals(entity.getUserId())) {
            return null;
        }
        return entity;
    }

    public void deleteVideoById(String videoId, String userId) {
        VideoRecording entity = findById(videoId, userId);
        if (entity == null) {
            throw new VideoNotFoundException("Video not found for id " + videoId);
        }

        String s3Key = entity.getS3Key();
        if (s3Key != null && !s3Key.isBlank()) {
            try {
                if (s3Key.endsWith("/")) {
                    ListObjectsV2Response listed = s3Client.listObjectsV2(
                            ListObjectsV2Request.builder()
                                    .bucket(bucketName)
                                    .prefix(s3Key)
                                    .build()
                    );
                    if (listed.contents() != null && !listed.contents().isEmpty()) {
                        List<ObjectIdentifier> keysToDelete = listed.contents().stream()
                                .map(obj -> ObjectIdentifier.builder().key(obj.key()).build())
                                .toList();

                        s3Client.deleteObjects(DeleteObjectsRequest.builder()
                                .bucket(bucketName)
                                .delete(Delete.builder().objects(keysToDelete).build())
                                .build());
                    }
                    logger.info("Deleted chunk prefix '{}' for videoId: {}", s3Key, videoId);
                } else {
                    s3Client.deleteObject(DeleteObjectRequest.builder()
                            .bucket(bucketName)
                            .key(s3Key)
                            .build());
                    logger.info("Deleted S3 object '{}' for videoId: {}", s3Key, videoId);
                }
            } catch (NoSuchKeyException ex) {
                logger.warn("S3 object '{}' already missing for videoId: {}", s3Key, videoId);
            }
        }

        videoRepository.deleteById(userId, videoId);
        logger.info("Deleted DB record for videoId: {}", videoId);
    }

    public VideoRecording saveChunkedVideoRecord(String userId,
                                                 String baseFileName,
                                                 String referenceId,
                                                 String mimeType,
                                                 Long fileSizeBytes,
                                                 Integer durationSeconds) {
        String effectiveRefId = (referenceId == null || referenceId.isBlank()) ? "note_123" : referenceId.trim();
        String seed = userId.trim() + "::" + baseFileName.trim();
        String videoId = java.util.UUID.nameUUIDFromBytes(seed.getBytes(java.nio.charset.StandardCharsets.UTF_8)).toString();
        String prefix = "video_recordings/" + userId + "/" + baseFileName + "/" + effectiveRefId + "/";

        VideoRecording existing = videoRepository.findById(userId, videoId);
        VideoRecording record = (existing != null) ? existing : new VideoRecording();

        record.setId(videoId);
        record.setUserId(userId);
        record.setReferenceId(effectiveRefId);
        record.setS3Key(prefix);
        record.setMimeType((mimeType == null || mimeType.isBlank()) ? "video/webm" : mimeType);
        if (fileSizeBytes != null) {
            record.setFileSizeBytes(fileSizeBytes);
        }
        if (durationSeconds != null) {
            record.setDurationSeconds(durationSeconds);
        }
        record.setStatus("READY");

        videoRepository.save(record);
        return record;
    }

    public List<String> getPlaybackParts(String userId, String baseFileName, String referenceId) {
        String effectiveRefId = (referenceId == null || referenceId.isBlank()) ? "note_123" : referenceId.trim();
        String prefix = "video_recordings/" + userId + "/" + baseFileName + "/" + effectiveRefId + "/";

        ListObjectsV2Response res = s3Client.listObjectsV2(
                ListObjectsV2Request.builder()
                        .bucket(bucketName)
                        .prefix(prefix)
                        .build()
        );

        if (res.contents() == null) {
            return List.of();
        }

        return res.contents().stream()
                .map(S3Object::key)
                .filter(key -> key.contains("/part_"))
                .sorted()
                .map(key -> s3Presigner.presignGetObject(
                        GetObjectPresignRequest.builder()
                                .signatureDuration(Duration.ofHours(1))
                                .getObjectRequest(GetObjectRequest.builder()
                                        .bucket(bucketName)
                                        .key(key)
                                        .build())
                                .build()
                ).url().toString())
                .toList();
    }
}