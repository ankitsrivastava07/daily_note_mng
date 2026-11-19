package com.daily_note_dms.documents.video.service;

import com.daily_note_dms.documents.video.entity.VideoRecording;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.*;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedPutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;

import java.time.Duration;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

@Service
public class VideoMergeService {

    private final Logger logger = LoggerFactory.getLogger(VideoMergeService.class);
    private final S3Client s3Client;
    private final S3Presigner s3Presigner;
    private final VideoStorageService videoStorageService;

    @Value("${aws.s3.bucket-name}")
    private String bucketName;

    public VideoMergeService(S3Client s3Client,
                             S3Presigner s3Presigner,
                             VideoStorageService videoStorageService) {
        this.s3Client = s3Client;
        this.s3Presigner = s3Presigner;
        this.videoStorageService = videoStorageService;
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

    public String streamLargeVideo(String baseFileName, String referenceId, String userId) {
        try {
            String effectiveRefId = resolveRefId(referenceId);
            String prefix = buildPrefix(userId, baseFileName, effectiveRefId);

            List<S3Object> allObjects = new ArrayList<>();
            String continuationToken = null;

            do {
                ListObjectsV2Request.Builder reqBuilder = ListObjectsV2Request.builder()
                        .bucket(bucketName)
                        .prefix(prefix);
                if (continuationToken != null) {
                    reqBuilder.continuationToken(continuationToken);
                }

                ListObjectsV2Response listRes = s3Client.listObjectsV2(reqBuilder.build());
                if (listRes.contents() != null) {
                    allObjects.addAll(listRes.contents());
                }
                continuationToken = listRes.isTruncated() ? listRes.nextContinuationToken() : null;
            } while (continuationToken != null);

            List<S3Object> sortedChunks = allObjects.stream()
                    .filter(obj -> obj.key().contains("/part_"))
                    .filter(obj -> !obj.key().contains("final_merged_video_"))
                    .filter(obj -> obj.size() != null && obj.size() > 0)
                    .sorted(Comparator.comparing(S3Object::key))
                    .toList();

            if (sortedChunks.isEmpty()) {
                throw new RuntimeException("No chunks found to merge for prefix: " + prefix);
            }

            String finalMergedKey = prefix + "final_merged_video_" + System.currentTimeMillis() + ".webm";

            CreateMultipartUploadResponse createRes = s3Client.createMultipartUpload(
                    CreateMultipartUploadRequest.builder()
                            .bucket(bucketName)
                            .key(finalMergedKey)
                            .contentType("video/webm")
                            .build()
            );

            String uploadId = createRes.uploadId();
            List<CompletedPart> completedParts = new ArrayList<>();
            long totalBytes = 0L;

            try {
                for (int i = 0; i < sortedChunks.size(); i++) {
                    S3Object s3Object = sortedChunks.get(i);
                    int partNumber = i + 1;
                    boolean isLast = (i == sortedChunks.size() - 1);

                    if (!isLast && s3Object.size() < 5L * 1024 * 1024) {
                        throw new IllegalStateException(
                                "Part " + partNumber + " (" + s3Object.key() + ") is smaller than 5MB (" + s3Object.size() + " bytes)."
                        );
                    }

                    UploadPartCopyResponse copyRes = s3Client.uploadPartCopy(
                            UploadPartCopyRequest.builder()
                                    .bucket(bucketName)
                                    .key(finalMergedKey)
                                    .uploadId(uploadId)
                                    .partNumber(partNumber)
                                    .sourceBucket(bucketName)
                                    .sourceKey(s3Object.key())
                                    .build()
                    );

                    completedParts.add(CompletedPart.builder()
                            .partNumber(partNumber)
                            .eTag(copyRes.copyPartResult().eTag())
                            .build());

                    totalBytes += s3Object.size();
                }

                s3Client.completeMultipartUpload(
                        CompleteMultipartUploadRequest.builder()
                                .bucket(bucketName)
                                .key(finalMergedKey)
                                .uploadId(uploadId)
                                .multipartUpload(CompletedMultipartUpload.builder().parts(completedParts).build())
                                .build()
                );
            } catch (Exception partErr) {
                s3Client.abortMultipartUpload(
                        AbortMultipartUploadRequest.builder()
                                .bucket(bucketName)
                                .key(finalMergedKey)
                                .uploadId(uploadId)
                                .build()
                );
                throw partErr;
            }

            // Cleanup raw part_ chunks so storage does not stay duplicated
            List<ObjectIdentifier> partIds = sortedChunks.stream()
                    .map(obj -> ObjectIdentifier.builder().key(obj.key()).build())
                    .toList();

            if (!partIds.isEmpty()) {
                s3Client.deleteObjects(DeleteObjectsRequest.builder()
                        .bucket(bucketName)
                        .delete(Delete.builder().objects(partIds).build())
                        .build());
            }

            // Save merged video record in DynamoDB via VideoStorageService
            VideoRecording record = new VideoRecording();
            record.setId(UUID.randomUUID().toString());
            record.setUserId(userId);
            record.setReferenceId(effectiveRefId);
            record.setS3Key(finalMergedKey);
            record.setMimeType("video/webm");
            record.setFileSizeBytes(totalBytes);
            record.setStatus("READY");
            videoStorageService.save(record);

            logger.info("Merged {} chunks into {} for userId={} refId={}",
                    sortedChunks.size(), finalMergedKey, userId, effectiveRefId);

            GetObjectRequest getReq = GetObjectRequest.builder()
                    .bucket(bucketName)
                    .key(finalMergedKey)
                    .responseContentType("video/webm")
                    .build();

            return s3Presigner.presignGetObject(GetObjectPresignRequest.builder()
                            .signatureDuration(Duration.ofHours(2))
                            .getObjectRequest(getReq)
                            .build())
                    .url()
                    .toString();

        } catch (Exception e) {
            throw new RuntimeException("Failed to merge video chunks: " + e.getMessage(), e);
        }
    }
}