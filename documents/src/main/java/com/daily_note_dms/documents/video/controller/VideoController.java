package com.daily_note_dms.documents.controller.video;

import com.daily_note_dms.documents.dto.PreSignedUrlResponse;
import com.daily_note_dms.documents.dto.VideoConfirmRequest;
import com.daily_note_dms.documents.dto.VideoUploadRequest;
import com.daily_note_dms.documents.service.VideoStorageService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/documents")
@CrossOrigin(origins = "*") // Frontend se CORS error hatane ke liye
public class VideoController {

    private final VideoStorageService videoStorageService;

    public VideoController(VideoStorageService videoStorageService) {
        this.videoStorageService = videoStorageService;
    }

    // Frontend jo GET call mar raha hai presigned URL ke liye
    @GetMapping("/presigned-url")
    public ResponseEntity<List<String>> getPresignedUrl(
            @RequestParam("referenceId") String referenceId,
            @RequestParam("fileNames") String fileName) {
        VideoUploadRequest request = new VideoUploadRequest();
        request.setReferenceId(referenceId);
        request.setFileName(fileName);
        request.setMimeType("video/webm");

        PreSignedUrlResponse response = videoStorageService.initiateVideoUpload(request);
        // Frontend array expect kar raha hai payload.data[0] ya payload[0] ke liye
        return ResponseEntity.ok(List.of(response.uploadUrl()));
    }

    // Upload complete hone ke baad status READY karne ke liye optional confirm API
    @PostMapping("/{videoId}/complete")
    public ResponseEntity<Void> confirmUpload(
            @PathVariable("videoId") String videoId,
            @RequestBody VideoConfirmRequest request) {

        videoStorageService.markUploadComplete(videoId, request.fileSizeBytes(), request.durationSeconds());
        return ResponseEntity.ok().build();
    }
}