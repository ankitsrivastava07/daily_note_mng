package com.daily_notes.notes.controller.note.short_note.v1;

import com.daily_notes.notes.dto.CreateShortNoteDto;
import com.daily_notes.notes.service.ShortNoteService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.HashMap;
import java.util.Map;

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

    @GetMapping(produces = "application/json")
    public ResponseEntity<?> getAllShortNotes(
            @RequestHeader(value = "userId", required = false) String userIdHeader,
            @RequestHeader(value = "userid", required = false) String userIdLower,
            @RequestParam(defaultValue = "10") Integer limit,
            @RequestHeader(value = "categoryId", required = false) String categoryIdHeader,
            @RequestHeader(value = "categoryid", required = false) String categoryIdLower,
            @RequestParam(required = false) String lastKey) { // <-- Accept lastKey query param

        String userid = userIdHeader != null ? userIdHeader : userIdLower;
        String categoryid = categoryIdHeader != null ? categoryIdHeader : categoryIdLower;

        if (userid == null || userid.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Required header 'userId' is missing", "success", false));
        }

        // Parse lastKey JSON string back into DynamoDB AttributeValue map if present
        Map<String, AttributeValue> decodedKey = null;
        if (lastKey != null && !lastKey.isEmpty()) {
            try {
                decodedKey = new ObjectMapper().readValue(lastKey, new TypeReference<Map<String, AttributeValue>>() {
                });
            } catch (Exception e) {
                return ResponseEntity.badRequest().body(Map.of("message", "Invalid lastKey format", "success", false));
            }
        }

        var page = shortNoteService.getAllShortNotes(
                categoryid,
                userid,
                limit,
                decodedKey // <-- Pass the decoded pagination key here
        );

        Map<String, Object> result = new HashMap<>();
        result.put("items", page.items());
        // Return the next evaluation key so the frontend can request the following page
        result.put("lastEvaluatedKey", page.lastEvaluatedKey());

        return ResponseEntity.ok(
                Map.of("data", result)
        );
    }

    @DeleteMapping
    public ResponseEntity<?> deleteShortNoteById(@RequestParam String category, @RequestHeader String userId, @PathVariable String shortNoteId) {
        return new ResponseEntity<>(shortNoteService.deleteShortNoteById(category, userId, shortNoteId), HttpStatus.OK);
    }

}
