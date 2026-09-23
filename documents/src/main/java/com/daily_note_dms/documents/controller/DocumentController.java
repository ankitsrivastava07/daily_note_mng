package com.daily_note_dms.documents.controller;

import com.daily_note_dms.documents.dto.DocumentDto;
import com.daily_note_dms.documents.service.FileService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/note/{noteId}/document")
@CrossOrigin(origins = "http://localhost:5173")
public class DocumentController {

    private final FileService fileService;

    public DocumentController(FileService fileService) {
        this.fileService = fileService;
    }

    @PostMapping
    public ResponseEntity<?> createPresignedURL(@PathVariable String noteId, @RequestBody DocumentDto documentDto) {
        return new ResponseEntity<>(fileService.createFileUploadPresignedURL(noteId, documentDto), HttpStatus.CREATED);
    }

  /*  @PutMapping("/{documentId}")
    public ResponseEntity<String> updateUploadUrl(@RequestBody DocumentDto documentDto) {
        return null;
    }*/

    @GetMapping
    public ResponseEntity<?> getAllDocumentsByNoteId(@PathVariable String noteId) {
        return new ResponseEntity<>(fileService.getAllDocumentByNoteId(noteId), HttpStatus.OK);
    }

}
