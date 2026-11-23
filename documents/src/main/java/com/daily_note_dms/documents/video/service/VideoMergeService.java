package com.daily_note_dms.documents.video.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.PresignedPutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;

import java.time.Duration;

@Service
public class VideoMergeService {

    private final Logger logger = LoggerFactory.getLogger(VideoMergeService.class);
    private final S3Presigner s3Presigner;

    @Value("${aws.s3.bucket-name}")
    private String bucketName;

    public VideoMergeService(S3Presigner s3Presigner) {
        this.s3Presigner = s3Presigner;
    }

    private String resolveRefId(String referenceId) {
        return (referenceId == null || referenceId.isBlank()) ? "note_123" : referenceId.trim();
    }

    private String buildPrefix(String userId, String baseFileName, String referenceId) {
        return "video_recordings/" + userId + "/" + baseFileName + "/" + resolveRefId(referenceId) + "/";
    }

    public String generatePresignedPutUrl(String userId,
                                          String baseFileName,
                                          String referenceId,
                                          String fileName,
                                          String contentType) {
        String key = buildPrefix(userId, baseFileName, referenceId) + fileName;

        PutObjectRequest putReq = PutObjectRequest.builder()
                .bucket(bucketName)
                .key(key)
                .contentType(contentType)
                .build();

        PutObjectPresignRequest presignReq = PutObjectPresignRequest.builder()
                .signatureDuration(Duration.ofMinutes(15))
                .putObjectRequest(putReq)
                .build();

        PresignedPutObjectRequest presigned = s3Presigner.presignPutObject(presignReq);
        return presigned.url().toString();
    }

    // Merge logic commented out intentionally
    /*
    public String streamLargeVideo(String baseFileName, String referenceId, String userId) {
        return streamLargeVideo(baseFileName, referenceId, userId, null);
    }

    public String streamLargeVideo(String baseFileName,
                                   String referenceId,
                                   String userId,
                                   String videoId) {
        ...
    }
    */
}