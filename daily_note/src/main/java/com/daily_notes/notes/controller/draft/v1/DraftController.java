package com.daily_notes.notes.controller.draft.v1;

import com.daily_notes.notes.records.CreateNoteDtoRecord;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/note/draft")
public class DraftController {

    @GetMapping("/{draftId}")
    public ResponseEntity<?> getDraftById(@PathVariable String draftId) {
        return ResponseEntity.ok().build();
    }

    @PostMapping
    public ResponseEntity<?> createDraft(@RequestBody CreateNoteDtoRecord createNoteDtoRecord) {
        return new ResponseEntity<>(createNoteDtoRecord, HttpStatus.CREATED);
    }
}