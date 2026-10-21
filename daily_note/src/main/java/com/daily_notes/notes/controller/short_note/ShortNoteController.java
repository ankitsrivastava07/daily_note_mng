package com.daily_notes.notes.controller.short_note;

import com.daily_notes.notes.dto.CreateShortNoteDto;
import com.daily_notes.notes.service.ShortNoteService;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;

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
    public ResponseEntity<?> createNote(
            @RequestBody CreateShortNoteDto createShortNoteDto) throws Exception {
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

        // FIXED: Decode as Map<String, String> instead of Map<String, AttributeValue>
        Map<String, AttributeValue> decodedKey = null;
        if (lastKey != null && !lastKey.isEmpty()) {
            try {
                Map<String, String> rawMap = new ObjectMapper().readValue(lastKey, new TypeReference<Map<String, String>>() {
                });
                decodedKey = new HashMap<>();
                for (Map.Entry<String, String> entry : rawMap.entrySet()) {
                    decodedKey.put(entry.getKey(), AttributeValue.builder().s(entry.getValue()).build());
                }
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

        // FIXED: Convert page.lastEvaluatedKey() to a safe Map<String, String> for Jackson serialization
        if (page.lastEvaluatedKey() != null && !page.lastEvaluatedKey().isEmpty()) {
            Map<String, String> serializableKey = new HashMap<>();
            for (Map.Entry<String, AttributeValue> entry : page.lastEvaluatedKey().entrySet()) {
                if (entry.getValue().s() != null) {
                    serializableKey.put(entry.getKey(), entry.getValue().s());
                }
            }
            result.put("lastEvaluatedKey", serializableKey);
        } else {
            result.put("lastEvaluatedKey", null);
        }

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
