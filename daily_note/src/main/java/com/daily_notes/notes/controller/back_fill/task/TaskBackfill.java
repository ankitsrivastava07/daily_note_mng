package com.daily_notes.notes.controller.back_fill.task;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/internal/tasks/backfill")
public class TaskBackfill {

    @PostMapping
    public ResponseEntity<?> taskBackFill(@RequestHeader String userId) {
        return new ResponseEntity<>(HttpStatus.OK);
    }
}
