package com.daily_note_dms.documents.video.controller;

import com.daily_note_dms.documents.dto.ApiResponse;
import com.daily_note_dms.documents.dto.PreSignedUrlResponse;
import com.daily_note_dms.documents.dto.VideoConfirmRequest;
import com.daily_note_dms.documents.dto.VideoUploadRequest;
import com.daily_note_dms.documents.video.dto.StatusUpdateRequest;
import com.daily_note_dms.documents.video.entity.VideoRecording;
import com.daily_note_dms.documents.video.service.VideoMergeService;
import com.daily_note_dms.documents.video.service.VideoStorageService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;
import software.amazon.awssdk.services.s3.model.CompletedPart;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/video")
public class VideoController {

    private final Logger logger = LoggerFactory.getLogger(VideoController.class);
    private final VideoStorageService videoStorageService;
    private final VideoMergeService videoMergeService;

    public VideoController(VideoStorageService videoStorageService,
                           VideoMergeService videoMergeService) {
        this.videoStorageService = videoStorageService;
        this.videoMergeService = videoMergeService;
    }

    @GetMapping("/presign-chunk")
    public ResponseEntity<?> presignChunk(
            @RequestParam String userId,
            @RequestParam String baseFileName,
            @RequestParam(required = false, defaultValue = "note_123") String referenceId,
            @RequestParam String fileName,
            @RequestParam(required = false, defaultValue = "video/webm") String contentType) {

        String uploadUrl = videoMergeService.generatePresignedPutUrl(
                userId, baseFileName, referenceId, fileName, contentType
        );

        return ResponseEntity.ok(Map.of(
                "status", "OK",
                "uploadUrl", uploadUrl
        ));
    }

    // Merge commented out — chunks stay as parts in S3 without backend merging
    /*
    @PostMapping("/merge-chunks")
    public ResponseEntity<?> mergeChunks(
            @RequestParam String baseFileName,
            @RequestParam(required = false, defaultValue = "note_123") String referenceId,
            @RequestParam String userId,
            @RequestParam(required = false) String videoId) {

        String finalUrl = videoMergeService.streamLargeVideo(baseFileName, referenceId, userId, videoId);

        return ResponseEntity.ok(Map.of(
                "status", "SUCCESS",
                "finalUrl", finalUrl
        ));
    }
    */

    @PostMapping("/register-chunks")
    public ResponseEntity<?> registerChunks(
            @RequestParam String userId,
            @RequestParam String baseFileName,
            @RequestParam(required = false, defaultValue = "note_123") String referenceId,
            @RequestParam(required = false, defaultValue = "video/webm") String mimeType,
            @RequestParam(required = false) Long fileSizeBytes,
            @RequestParam(required = false) Integer durationSeconds) {

        VideoRecording saved = videoStorageService.saveChunkedVideoRecord(
                userId, baseFileName, referenceId, mimeType, fileSizeBytes, durationSeconds
        );

        return ResponseEntity.ok(Map.of(
                "status", "SUCCESS",
                "videoId", saved.getId(),
                "data", saved
        ));
    }

    @GetMapping("/playback-parts")
    public ResponseEntity<List<String>> getPlaybackParts(
            @RequestParam String userId,
            @RequestParam String baseFileName,
            @RequestParam(required = false, defaultValue = "note_123") String referenceId) {

        return ResponseEntity.ok(
                videoStorageService.getPlaybackParts(userId, baseFileName, referenceId)
        );
    }

    @GetMapping(
            value = "/playback/stream",
            produces = "video/webm"
    )
    public ResponseEntity<StreamingResponseBody> streamVideo(
            @RequestParam String userId,
            @RequestParam String baseFileName,
            @RequestParam(required = false, defaultValue = "note_123")
            String referenceId) {

        logger.info(
                "Video streaming requested for userId: {}, baseFileName: {}",
                userId,
                baseFileName
        );

        StreamingResponseBody stream = outputStream -> {
            try {
                videoStorageService.streamChunkedVideo(
                        userId,
                        baseFileName,
                        referenceId,
                        outputStream
                );
            } catch (IOException ex) {
                logger.error("Video streaming failed", ex);
                throw ex;
            }
        };

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("video/webm"))
                .header(
                        HttpHeaders.CONTENT_DISPOSITION,
                        "inline; filename=\"recording.webm\""
                )
                .body(stream);
    }

    @GetMapping("/presign-url")
    public ResponseEntity<PreSignedUrlResponse> getPresignedUrl(
            @RequestParam("referenceId") String referenceId,
            @RequestParam("fileName") String fileName,
            @RequestParam("userId") String userId,
            @RequestParam("mimeType") String mimeType,
            @RequestParam(required = false) String videoId) {

        logger.info(
                "Presigned URL request received. userId: {}, referenceId: {}, videoId: {}, fileName: {}",
                userId, referenceId, videoId, fileName
        );
        VideoUploadRequest request = new VideoUploadRequest();
        request.setUserId(userId);
        request.setReferenceId(referenceId);
        request.setFileName(fileName);
        request.setMimeType(mimeType);
        request.setVideoId(videoId);

        PreSignedUrlResponse response = videoStorageService.initiateVideoUpload(request);

        logger.info(
                "Presigned PUT URL generated successfully for videoId: {}",
                response.videoId()
        );
        return new ResponseEntity<>(response, HttpStatus.OK);
    }

    @PostMapping("/{videoId}/complete")
    public ResponseEntity<Void> confirmUpload(
            @PathVariable("videoId") String videoId,
            @RequestBody VideoConfirmRequest request, @RequestParam String userId) {
        logger.info("Confirming upload for videoId: {} with fileSizeBytes: {} and durationSeconds: {}",
                videoId, request.fileSizeBytes(), request.durationSeconds());
        videoStorageService.markUploadComplete(videoId, request.fileSizeBytes(), request.durationSeconds(), userId);
        logger.info("Upload confirmed for videoId: {}", videoId);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/reference/{referenceId}/user/{userId}")
    public ResponseEntity<List<VideoRecording>> listUserVideos(@PathVariable String referenceId,
                                                               @PathVariable String userId) {
        return ResponseEntity.ok(videoStorageService.findByUserId(userId));
    }

    @GetMapping("/playback/{videoId}")
    public ResponseEntity<String> getPlaybackUrl(@PathVariable String videoId, @RequestParam String userId) {
        String url = videoStorageService.generatePlaybackUrl(videoId, userId);
        return ResponseEntity.ok(url);
    }

    @PatchMapping("/status/{id}")
    public ResponseEntity<Void> updateVideoStatus(@PathVariable String id,
                                                  @RequestBody StatusUpdateRequest request,
                                                  @RequestParam String userId) {
        VideoRecording record = videoStorageService.findById(id, userId);
        if (record != null) {
            record.setStatus(request.getStatus());
            videoStorageService.save(record);

            return ResponseEntity.ok().build();
        }
        return ResponseEntity.notFound().build();
    }

    @DeleteMapping("/{videoId}")
    public ResponseEntity<ApiResponse> deleteVideo(@PathVariable String videoId, @RequestParam String userId) {
        videoStorageService.deleteVideoById(videoId, userId);
        ApiResponse apiResponse = new ApiResponse("Video deleted successfully",
                true, new ArrayList<>(), new ArrayList<>());
        return new ResponseEntity<>(apiResponse, HttpStatus.OK);
    }

    // 1. Initiate S3 Multipart Upload
    @PostMapping("/multipart/initiate")
    public ResponseEntity<Map<String, String>> initiateMultipartUpload(
            @RequestParam String userId,
            @RequestParam String baseFileName,
            @RequestParam(required = false, defaultValue = "note_123") String referenceId,
            @RequestParam(required = false, defaultValue = "video/webm") String mimeType) {

        Map<String, String> response =
                videoStorageService.initiateMultipartUpload(
                        userId, baseFileName, referenceId, mimeType
                );

        return ResponseEntity.ok(response);
    }


    // 2. Generate Presigned URL for each S3 Part
    @GetMapping("/multipart/part-url")
    public ResponseEntity<Map<String, String>> generateMultipartPartUrl(
            @RequestParam String userId,
            @RequestParam String videoId,
            @RequestParam int partNumber) {

        String uploadUrl = videoStorageService.generatePartUploadUrl(
                userId, videoId, partNumber
        );

        return ResponseEntity.ok(Map.of(
                "uploadUrl", uploadUrl,
                "partNumber", String.valueOf(partNumber)
        ));
    }

    // 3. Complete S3 Multipart Upload
    @PostMapping("/multipart/complete")
    public ResponseEntity<Map<String, String>> completeMultipartUpload(
            @RequestParam String userId,
            @RequestParam String videoId,
            @RequestBody MultipartCompleteRequest request) {

        List<CompletedPart> completedParts = request.parts().stream()
                .map(part -> CompletedPart.builder()
                        .partNumber(part.partNumber())
                        .eTag(part.eTag())
                        .build())
                .collect(Collectors.toCollection(ArrayList::new));

        videoStorageService.completeMultipartUpload(
                userId,
                videoId,
                completedParts,
                request.fileSizeBytes(),
                request.durationSeconds()
        );

        return ResponseEntity.ok(Map.of(
                "status", "SUCCESS",
                "message", "Video uploaded successfully",
                "videoId", videoId
        ));
    }

    // Request DTOs
    public record MultipartCompleteRequest(
            List<MultipartPart> parts,
            Long fileSizeBytes,
            Integer durationSeconds
    ) {
    }

    public record MultipartPart(
            Integer partNumber,
            String eTag
    ) {
    }
}