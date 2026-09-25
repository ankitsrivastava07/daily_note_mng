package com.daily_note_dms.documents.controller;

import com.daily_note_dms.documents.dto.DocumentDto;
import com.daily_note_dms.documents.service.DocumentService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.logging.Logger;

@RestController
@RequestMapping("/api/v1/{referenceId}/dms")
public class DocumentController {

    private final DocumentService documentService;
    private final Logger logger = Logger.getLogger(DocumentController.class.getName());

    public DocumentController(DocumentService documentService) {
        this.documentService = documentService;
    }

    @PostMapping
    public ResponseEntity<?> saveDocument(@PathVariable String referenceId,
                                          @RequestBody List<DocumentDto> documentDtos) {
        return new ResponseEntity<>(documentService
                .saveDocument(referenceId, documentDtos),
                HttpStatus.CREATED);
    }

  /*  @PutMapping("/{documentId}")
    public ResponseEntity<String> updateUploadUrl(@RequestBody DocumentDto documentDto) {
        return null;
    }*/

   /* @GetMapping
    public ResponseEntity<?> getAllDocumentsByNoteId(@PathVariable String referenceId) {
        return new ResponseEntity<>(documentService.getAllDocumentByNoteId(referenceId),
                HttpStatus.OK);
    }*/

    @GetMapping("/presigned")
    public ResponseEntity<?> createPresignedURL(@PathVariable String referenceId,
                                                @RequestParam List<String> fileName) {
        return new ResponseEntity<>(documentService
                .getPresignedURL(referenceId, fileName), HttpStatus.CREATED);
    }

}
