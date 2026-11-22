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
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.NoSuchKeyException;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
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

    public void markUploadComplete(String videoId, Long fileSize, Integer duration) {
        logger.info("Marking Video Upload Complete: {}", videoId);
        VideoRecording entity = Optional.ofNullable(videoRepository.findById(videoId))
                .orElseThrow(() -> new VideoNotFoundException("Video record not found"));
        logger.info("Marking Video Upload Complete: {}", videoId);
        entity.setFileSizeBytes(fileSize);
        entity.setDurationSeconds(duration);
        entity.setStatus("READY");
        videoRepository.save(entity);
    }

    public String generatePlaybackUrl(String videoId, String userId) {
        logger.info("Generating Playback Url for Video: {}", videoId);
        VideoRecording entity = Optional.ofNullable(videoRepository.findById(videoId, userId))
                .orElseThrow(() -> new VideoNotFoundException("Video not found"));

        logger.info("Generating presigned GET URL for videoId: {} with S3 key: {}", videoId, entity.getS3Key());

        GetObjectRequest getObjectRequest = GetObjectRequest.builder()
                .bucket(bucketName)
                .key(entity.getS3Key())
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

    public VideoRecording findById(String id) {
        return videoRepository.getItem(id).orElse(null);
    }

    public VideoRecording findById(String id, String userId) {
        return videoRepository.getItem(id).orElse(null);
    }

    public void deleteVideoById(String videoId, String userId) {
        VideoRecording entity = Optional.ofNullable(findById(videoId, userId))
                .orElseThrow(() -> new VideoNotFoundException("Video not found"));

        String s3Key = entity.getS3Key();
        if (s3Key != null && !s3Key.isBlank()) {
            try {
                s3Client.deleteObject(DeleteObjectRequest.builder()
                        .bucket(bucketName)
                        .key(s3Key)
                        .build());
                logger.info("Deleted S3 object '{}' for videoId: {}", s3Key, videoId);
            } catch (NoSuchKeyException ex) {
                logger.warn("S3 object '{}' already missing for videoId: {}", s3Key, videoId);
            }
        }

        videoRepository.deleteById(videoId, userId);
        logger.info("Deleted DB record for videoId: {}", videoId);
    }
}