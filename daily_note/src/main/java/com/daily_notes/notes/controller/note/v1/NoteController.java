package com.daily_notes.notes.controller.note.v1;

import com.daily_notes.notes.records.CreateNoteDtoRecord;
import com.daily_notes.notes.service.NoteService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/daily-note")
public class NoteController {

    private final NoteService noteService;

    public NoteController(NoteService noteService) {
        this.noteService = noteService;
    }

    @PostMapping
    public ResponseEntity<?> createNote(@RequestBody CreateNoteDtoRecord createNoteDto) {
        return new ResponseEntity<>(noteService.createNote(createNoteDto), HttpStatus.CREATED);
    }

    @GetMapping("/{noteId}")
    public ResponseEntity<?> getNoteById(@PathVariable String noteId, @RequestHeader String userId) {
        return new ResponseEntity<>(noteService.getNoteById(noteId, userId), HttpStatus.OK);
    }

    @GetMapping
    public ResponseEntity<?> getAllNotes(@RequestParam(defaultValue = "0", required = false) Integer offset,
                                         @RequestParam(defaultValue = "10", required = false) Integer limit, @RequestHeader String userId) {
        return new ResponseEntity<>(noteService.getAllNotes(userId, offset, limit), HttpStatus.OK);
    }
}
