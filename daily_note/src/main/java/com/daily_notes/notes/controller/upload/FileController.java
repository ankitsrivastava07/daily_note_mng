package com.daily_notes.notes.controller.upload;

import com.daily_notes.notes.dto.ApiResponseRecord;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;

@RestController
@RequestMapping("api/v1/file_handler")
public class FileController {

    @PostMapping
    public ResponseEntity<String> upload(@RequestParam("file") MultipartFile file) {
        // Handle file upload logic here
        return ResponseEntity.ok("File uploaded successfully: " + file.getOriginalFilename());
    }

    @GetMapping("/presigned-url")
    public ResponseEntity<ApiResponseRecord> getPresignedUrl() {
        // Handle file upload logic here
        return new ResponseEntity<>(new ApiResponseRecord("Success", new ArrayList<>(), new ArrayList<>(), true),
                HttpStatus.OK);
    }
}
