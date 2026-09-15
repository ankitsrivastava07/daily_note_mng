package com.daily_note.search_text_app.controller;

import com.daily_note.search_text_app.entity.TaskSearchDocument;
import com.daily_note.search_text_app.service.TaskSearchService;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("api/v1/user/{userId}/task")
public class TaskSearchController {

    private final TaskSearchService taskSearchService;

    public TaskSearchController(TaskSearchService taskSearchService) {
        this.taskSearchService = taskSearchService;
    }

    @GetMapping
    public ResponseEntity<Page<TaskSearchDocument>> getAllTasks(
            @PathVariable String userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "") String search) {

        return ResponseEntity.ok(
                taskSearchService.getAllTasks(
                        userId,
                        page,
                        size,
                        search
                )
        );
    }
}