package com.daily_note_dms.documents.controller;

import com.daily_note_dms.documents.dto.DocumentDto;
import com.daily_note_dms.documents.service.DocumentService;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import software.amazon.awssdk.annotations.NotNull;

import java.util.List;
import java.util.logging.Logger;

@RestController
@RequestMapping("/api/v1/{referenceId}/dms")
public class DocumentController {

    private static final org.slf4j.Logger log = LoggerFactory.getLogger(DocumentController.class);
    private final DocumentService documentService;
    private final Logger logger = Logger.getLogger(DocumentController.class.getName());

    public DocumentController(DocumentService documentService) {
        this.documentService = documentService;
    }

    @PostMapping
    public ResponseEntity<?> saveDocument(@PathVariable @NotNull String referenceId,
                                          @RequestBody List<DocumentDto> documentDtos) {
        logger.info("Save Document Start for referenceId {} " + referenceId + " and documentDtos {} " + documentDtos);
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
        logger.info("createPresignedURL Start for referenceId {} " + referenceId + " and fileName {} " + fileName);
        return new ResponseEntity<>(documentService
                .getPresignedURL(referenceId, fileName), HttpStatus.CREATED);
    }

}
