package com.daily_note_dms.documents.service;

import com.daily_note_dms.documents.dto.PreSignedUrlResponse;
import com.daily_note_dms.documents.dto.VideoUploadRequest;
import com.daily_note_dms.documents.exception.VideoNotFoundException;
import com.daily_note_dms.documents.repository.VideoRepository;
import com.daily_note_dms.documents.video.entity.VideoRecording;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedPutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;

import java.time.Duration;
import java.util.Optional;
import java.util.UUID;

@Service
public class VideoStorageService {

    private final S3Presigner s3Presigner;
    private final VideoRepository videoRepository;

    @Value("${aws.s3.bucket-name}")
    private String bucketName;

    public VideoStorageService(S3Presigner s3Presigner, VideoRepository videoRepository) {
        this.s3Presigner = s3Presigner;
        this.videoRepository = videoRepository;
    }

    public PreSignedUrlResponse initiateVideoUpload(VideoUploadRequest req) {
        String videoId = UUID.randomUUID().toString();
        String s3Key = String.format("recordings/%s/%s.webm", req.getReferenceId(), videoId);

        // Save initial PENDING record
        VideoRecording entity = new VideoRecording();
        entity.setVideoId(videoId);
        entity.setReferenceId(req.getReferenceId());
        entity.setS3Key(s3Key);
        entity.setMimeType(req.getMimeType());
        entity.setStatus("PENDING");
        videoRepository.save(entity);

        // Generate 15-min PUT URL
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

    public void markUploadComplete(String videoId, Long fileSize, Integer duration) {
        VideoRecording entity = Optional.ofNullable(videoRepository.findById(videoId))
                .orElseThrow(() -> new VideoNotFoundException("Video record not found"));
        entity.setFileSizeBytes(fileSize);
        entity.setDurationSeconds(duration);
        entity.setStatus("READY");
        videoRepository.save(entity);
    }

    public String generatePlaybackUrl(String videoId) {
        VideoRecording entity = Optional.ofNullable(videoRepository.findById(videoId))
                .orElseThrow(() -> new VideoNotFoundException("Video not found"));

        GetObjectRequest getObjectRequest = GetObjectRequest.builder()
                .bucket(bucketName)
                .key(entity.getS3Key())
                .build();

        GetObjectPresignRequest presignRequest = GetObjectPresignRequest.builder()
                .signatureDuration(Duration.ofHours(1))
                .getObjectRequest(getObjectRequest)
                .build();

        return s3Presigner.presignGetObject(presignRequest).url().toString();
    }
}