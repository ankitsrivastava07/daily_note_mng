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
import software.amazon.awssdk.core.ResponseInputStream;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.*;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedPutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.UploadPartPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedUploadPartRequest;

import java.io.IOException;
import java.io.OutputStream;
import java.time.Duration;
import java.time.Instant;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

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
        logger.info("Initiating video upload for user: {}", req.getUserId());

        String videoId;
        VideoRecording entity;

        // 1. Check whether this is a new or existing recording
        if (req.getVideoId() == null || req.getVideoId().isBlank()) {
            videoId = UUID.randomUUID().toString();

            String s3Prefix = String.format(
                    "video_recordings/%s/%s/%s/",
                    req.getUserId(),
                    req.getReferenceId(),
                    videoId
            );

            entity = new VideoRecording();
            entity.setId(videoId);
            entity.setUserId(req.getUserId());
            entity.setReferenceId(req.getReferenceId());
            entity.setS3Key(s3Prefix);
            entity.setMimeType(req.getMimeType());
            entity.setStatus("UPLOADING");
            entity.setTotalParts(0);
            entity.setLastUploadedPart(-1);
            entity.setUploadedBytes(0L);
            entity.setCreatedAt(Instant.now().toString());
            entity.setUpdatedAt(Instant.now().toString());

            videoRepository.save(entity);

            logger.info("New video recording created: {}", videoId);

        } else {

            // 2. Fetch existing recording
            videoId = req.getVideoId();

            entity = videoRepository.findById(
                    req.getUserId(),
                    videoId
            );

            if (entity == null) {
                throw new IllegalArgumentException(
                        "Video recording not found: " + videoId
                );
            }

            if (!"UPLOADING".equals(entity.getStatus())) {
                throw new IllegalStateException(
                        "Video is not in UPLOADING status"
                );
            }

            logger.info("Existing video recording found: {}", videoId);
        }

        // 3. Build exact S3 prefix
        String s3Prefix = entity.getS3Key();

        // 4. Find existing uploaded parts in S3
        List<Integer> uploadedParts = listCleanFileNames(s3Prefix)
                .stream()
                .map(name -> name.replace("part_", ""))
                .filter(name -> name.matches("\\d+"))
                .map(Integer::parseInt)
                .distinct()
                .sorted()
                .toList();

        // 5. Find next missing part number (starts from 0)
        Set<Integer> uploadedSet = new HashSet<>(uploadedParts);

        int partNumber = 0;

        while (uploadedSet.contains(partNumber)) {
            partNumber++;
        }

        // 6. Create S3 key for the next chunk
        String chunkKey = s3Prefix + "part_" + partNumber;

        // 7. Generate presigned PUT URL
        PutObjectRequest objectRequest = PutObjectRequest.builder()
                .bucket(bucketName)
                .key(chunkKey)
                .contentType(req.getMimeType())
                .build();

        PutObjectPresignRequest presignRequest =
                PutObjectPresignRequest.builder()
                        .signatureDuration(Duration.ofMinutes(15))
                        .putObjectRequest(objectRequest)
                        .build();

        PresignedPutObjectRequest presignedRequest =
                s3Presigner.presignPutObject(presignRequest);

        logger.info(
                "Presigned URL generated. videoId: {}, partNumber: {}",
                videoId, partNumber
        );

        return new PreSignedUrlResponse(
                videoId,
                presignedRequest.url().toString(),
                chunkKey
        );
    }

   /* public String getPresignedViewUrl(String s3Key) {
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
    }*/

    // Fetch only the filename without folder prefix (e.g., "folder/test.pdf" -> "test.pdf")
    public List<String> listCleanFileNames(String folderPrefix) {
        ListObjectsV2Request request = ListObjectsV2Request.builder()
                .bucket(bucketName)
                .prefix(folderPrefix) // e.g., "uploads/"
                .build();

        return s3Client.listObjectsV2Paginator(request) // Handles >1,000 files automatically
                .contents().stream()
                .map(S3Object::key)
                .filter(key -> !key.endsWith("/")) // Exclude empty folder markers
                .map(key -> key.substring(key.lastIndexOf('/') + 1))
                .collect(Collectors.toList());
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

    private static final Pattern PART_PATTERN =
            Pattern.compile("part_(\\d+)(?:\\.[^/]*)?$");

    private List<String> getOrderedChunkKeys(
            String userId,
            String baseFileName,
            String referenceId) {

        String effectiveRefId =
                (referenceId == null || referenceId.isBlank())
                        ? "note_123"
                        : referenceId.trim();

        String prefix = "video_recordings/"
                + userId + "/"
                + baseFileName + "/"
                + effectiveRefId + "/";

        List<String> keys = new ArrayList<>();
        String continuationToken = null;

        do {
            ListObjectsV2Request.Builder request =
                    ListObjectsV2Request.builder()
                            .bucket(bucketName)
                            .prefix(prefix)
                            .maxKeys(1000);

            if (continuationToken != null) {
                request.continuationToken(continuationToken);
            }

            ListObjectsV2Response response =
                    s3Client.listObjectsV2(request.build());

            response.contents().stream()
                    .map(S3Object::key)
                    .filter(key -> PART_PATTERN.matcher(
                            key.substring(key.lastIndexOf('/') + 1)
                    ).matches())
                    .forEach(keys::add);

            continuationToken = response.nextContinuationToken();

        } while (continuationToken != null);

        keys.sort(Comparator.comparingInt(this::getPartNumber));

        if (keys.isEmpty()) {
            throw new VideoNotFoundException(
                    "No video chunks found under prefix: " + prefix
            );
        }

        return keys;
    }

    private int getPartNumber(String key) {

        String fileName = key.substring(key.lastIndexOf('/') + 1);

        Matcher matcher = PART_PATTERN.matcher(fileName);

        if (!matcher.matches()) {
            throw new IllegalArgumentException(
                    "Invalid video chunk name: " + key
            );
        }

        return Integer.parseInt(matcher.group(1));
    }

    /**
     * Streams all MediaRecorder chunks sequentially as ONE video response.
     * Does not load the complete video into application memory.
     */
    public void streamChunkedVideo(
            String userId,
            String baseFileName,
            String referenceId,
            OutputStream outputStream) throws IOException {

        List<String> chunkKeys =
                getOrderedChunkKeys(userId, baseFileName, referenceId);

        byte[] buffer = new byte[64 * 1024];

        for (String key : chunkKeys) {

            GetObjectRequest request = GetObjectRequest.builder()
                    .bucket(bucketName)
                    .key(key)
                    .build();

            try (ResponseInputStream<GetObjectResponse> inputStream =
                         s3Client.getObject(request)) {

                int bytesRead;

                while ((bytesRead = inputStream.read(buffer)) != -1) {
                    outputStream.write(buffer, 0, bytesRead);
                }

                outputStream.flush();
            }

            logger.info("Streamed video chunk: {}", key);
        }

        logger.info(
                "Completed video playback. Total chunks: {}",
                chunkKeys.size()
        );
    }

    public Map<String, String> initiateMultipartUpload(
            String userId,
            String baseFileName,
            String referenceId,
            String mimeType) {

        String videoId = UUID.randomUUID().toString();

        String s3Key = "video_recordings/" + userId + "/"
                + baseFileName + "/" + referenceId + "/"
                + baseFileName + ".webm";

        CreateMultipartUploadResponse response =
                s3Client.createMultipartUpload(
                        CreateMultipartUploadRequest.builder()
                                .bucket(bucketName)
                                .key(s3Key)
                                .contentType(mimeType)
                                .build()
                );

        VideoRecording entity = new VideoRecording();
        entity.setId(videoId);
        entity.setUserId(userId);
        entity.setReferenceId(referenceId);
        entity.setS3Key(s3Key);
        entity.setMultipartUploadId(response.uploadId());
        entity.setMimeType(mimeType);
        entity.setStatus("UPLOADING");
        entity.setCreatedAt(Instant.now().toString());
        entity.setUpdatedAt(Instant.now().toString());

        videoRepository.save(entity);

        return Map.of(
                "videoId", videoId,
                "uploadId", response.uploadId(),
                "s3Key", s3Key
        );
    }

    public void completeMultipartUpload(
            String userId,
            String videoId,
            List<CompletedPart> completedParts,
            Long fileSizeBytes,
            Integer durationSeconds) {

        VideoRecording record = Optional.ofNullable(
                videoRepository.findById(userId, videoId)
        ).orElseThrow(() ->
                new VideoNotFoundException("Video record not found: " + videoId)
        );

        String uploadId = record.getMultipartUploadId();

        if (uploadId == null || uploadId.isBlank()) {
            throw new IllegalStateException("Multipart upload ID not found");
        }

        if (completedParts == null || completedParts.isEmpty()) {
            throw new IllegalArgumentException("No uploaded parts received");
        }

        List<CompletedPart> sortedParts = new ArrayList<>(completedParts);
        sortedParts.sort(Comparator.comparingInt(CompletedPart::partNumber));

        for (int i = 0; i < sortedParts.size(); i++) {
            CompletedPart part = sortedParts.get(i);

            if (part.partNumber() == null || part.partNumber() != i + 1) {
                throw new IllegalArgumentException(
                        "Invalid or missing part number. Expected: " + (i + 1)
                );
            }

            if (part.eTag() == null || part.eTag().isBlank()) {
                throw new IllegalArgumentException(
                        "ETag missing for part: " + part.partNumber()
                );
            }
        }

        CompleteMultipartUploadRequest request =
                CompleteMultipartUploadRequest.builder()
                        .bucket(bucketName)
                        .key(record.getS3Key())
                        .uploadId(uploadId)
                        .multipartUpload(
                                CompletedMultipartUpload.builder()
                                        .parts(sortedParts)
                                        .build()
                        )
                        .build();

        s3Client.completeMultipartUpload(request);

        record.setFileSizeBytes(fileSizeBytes);
        record.setDurationSeconds(durationSeconds);
        record.setStatus("READY");
        record.setMultipartUploadId(null);
        record.setUpdatedAt(Instant.now().toString());

        videoRepository.save(record);

        logger.info(
                "Multipart upload completed successfully. videoId: {}, parts: {}",
                videoId,
                sortedParts.size()
        );
    }

    public String generatePartUploadUrl(
            String userId,
            String videoId,
            int partNumber) {

        if (partNumber < 1 || partNumber > 10000) {
            throw new IllegalArgumentException(
                    "Part number must be between 1 and 10000"
            );
        }

        VideoRecording record = Optional.ofNullable(
                videoRepository.findById(userId, videoId)
        ).orElseThrow(() ->
                new VideoNotFoundException(
                        "Video record not found: " + videoId
                )
        );

        String uploadId = record.getMultipartUploadId();

        if (uploadId == null || uploadId.isBlank()) {
            throw new IllegalStateException(
                    "Multipart upload ID not found for video: " + videoId
            );
        }

        UploadPartRequest uploadPartRequest =
                UploadPartRequest.builder()
                        .bucket(bucketName)
                        .key(record.getS3Key())
                        .uploadId(uploadId)
                        .partNumber(partNumber)
                        .build();

        UploadPartPresignRequest presignRequest =
                UploadPartPresignRequest.builder()
                        .signatureDuration(Duration.ofMinutes(15))
                        .uploadPartRequest(uploadPartRequest)
                        .build();

        PresignedUploadPartRequest presignedRequest =
                s3Presigner.presignUploadPart(presignRequest);

        logger.info(
                "Multipart part URL generated. videoId: {}, partNumber: {}",
                videoId,
                partNumber
        );

        return presignedRequest.url().toString();
    }
}