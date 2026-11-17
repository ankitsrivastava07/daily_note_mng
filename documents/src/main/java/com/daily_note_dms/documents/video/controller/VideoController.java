package com.daily_note_dms.documents.video.controller;

import com.daily_note_dms.documents.dto.PreSignedUrlResponse;
import com.daily_note_dms.documents.dto.VideoConfirmRequest;
import com.daily_note_dms.documents.dto.VideoUploadRequest;
import com.daily_note_dms.documents.video.service.VideoStorageService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/video")
public class VideoController {

    private final VideoStorageService videoStorageService;
    private final Logger logger = LoggerFactory.getLogger(VideoController.class);

    public VideoController(VideoStorageService videoStorageService) {
        this.videoStorageService = videoStorageService;
    }

    @GetMapping("/presigned-url")
    public ResponseEntity<List<String>> getPresignedUrl(
            @RequestParam("referenceId") String referenceId,
            @RequestParam("fileName") String fileName,
            @RequestParam("userId") String userId,
            @RequestParam("mimeType") String mimeType) {

        logger.info("Request received for presigned URL with referenceId: {} and userId: {}", referenceId, userId);

        VideoUploadRequest request = new VideoUploadRequest();
        request.setUserId(userId);
        request.setReferenceId(referenceId);
        request.setFileName(fileName);
        request.setMimeType(mimeType);

        PreSignedUrlResponse response = videoStorageService.initiateVideoUpload(request);

        logger.info("Generated PUT presigned URL for videoId: {}", response.videoId());
        return ResponseEntity.ok(List.of(response.uploadUrl()));
    }

    // Upload complete hone ke baad status READY karne ke liye optional confirm API
    @PostMapping("/{videoId}/complete")
    public ResponseEntity<Void> confirmUpload(
            @PathVariable("videoId") String videoId,
            @RequestBody VideoConfirmRequest request) {
        logger.info("Confirming upload for videoId: {} with fileSizeBytes: {} and durationSeconds: {}",
                videoId, request.fileSizeBytes(), request.durationSeconds());
        videoStorageService.markUploadComplete(videoId, request.fileSizeBytes(), request.durationSeconds());
        logger.info("Upload confirmed for videoId: {}", videoId);
        return ResponseEntity.ok().build();
    }
}