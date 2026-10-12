package com.daily_notes.notes.controller.note.short_note.v1;

import com.daily_notes.notes.dto.CreateShortNoteDto;
import com.daily_notes.notes.service.ShortNoteService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpHeaders;
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
            HttpServletRequest request,
            @RequestParam(defaultValue = "10") Integer limit,
            @RequestParam(required = false) String lastKey) {

        // Check all common casing variants sent by browsers or gateways
        String userid = request.getHeader("userId");
        if (userid == null) userid = request.getHeader("userid");
        if (userid == null) userid = request.getHeader("Userid");

        if (userid == null || userid.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Required header 'userid' is missing", "success", false));
        }

        String categoryid = request.getHeader("categoryId");
        if (categoryid == null) categoryid = request.getHeader("categoryid");
        if (categoryid == null) categoryid = request.getHeader("Categoryid");

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
                categoryid != null ? categoryid : "hgfhgf",
                userid,
                limit,
                decodedKey
        );

        Map<String, Object> result = new HashMap<>();
        result.put("items", page.items());
        result.put("lastEvaluatedKey", page.lastEvaluatedKey());

        return ResponseEntity.ok(Map.of("data", result));
    }

    // Helper method for case-insensitive header checking
    private String getHeaderIgnoreCase(HttpHeaders headers, String targetKey) {
        for (Map.Entry<String, java.util.List<String>> entry : headers.entrySet()) {
            if (entry.getKey().equalsIgnoreCase(targetKey) && entry.getValue() != null && !entry.getValue().isEmpty()) {
                return entry.getValue().get(0);
            }
        }
        return null;
    }

    @DeleteMapping
    public ResponseEntity<?> deleteShortNoteById(@RequestParam String category, @RequestHeader String userId, @PathVariable String shortNoteId) {
        return new ResponseEntity<>(shortNoteService.deleteShortNoteById(category, userId, shortNoteId), HttpStatus.OK);
    }

}
