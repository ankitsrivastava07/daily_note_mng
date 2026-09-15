package com.daily_notes.notes.controller.note.short_note.v1;

import com.daily_notes.notes.dto.CreateShortNoteDto;
import com.daily_notes.notes.service.ShortNoteService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/short-note")
public class ShortNoteController {

    private final ShortNoteService shortNoteService;

    public ShortNoteController(ShortNoteService shortNoteService) {
        this.shortNoteService = shortNoteService;
    }

    @PostMapping
    public ResponseEntity<?> createNote(@RequestHeader String userId,
                                        @RequestBody CreateShortNoteDto createShortNoteDto) {
        return new ResponseEntity<>(shortNoteService.createShortNote(createShortNoteDto),
                HttpStatus.CREATED);
    }

    @GetMapping
    public ResponseEntity<?> getAllShortNotes(@RequestHeader String userId,
                                              @RequestParam(defaultValue = "10") Integer limit,
                                              @RequestHeader String categoryId) {
        return new ResponseEntity<>(shortNoteService
                .getAllShortNotes(categoryId, userId, limit, null), HttpStatus.OK);
    }

    @DeleteMapping
    public ResponseEntity<?> deleteShortNoteById(@RequestParam String category, @RequestHeader String userId, @PathVariable String shortNoteId) {
        return new ResponseEntity<>(shortNoteService.deleteShortNoteById(category, userId, shortNoteId), HttpStatus.OK);
    }

}
