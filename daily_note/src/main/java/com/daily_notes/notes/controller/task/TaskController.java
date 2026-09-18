package com.daily_notes.notes.controller.task;

import com.daily_notes.notes.dto.TaskDto;
import com.daily_notes.notes.service.TaskService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("api/v1/user/{userId}/task")
public class TaskController {

    @Autowired
    private TaskService taskService;

    @PostMapping
    public ResponseEntity<?> createTask(@RequestBody TaskDto taskDto) {
        return new ResponseEntity<>(taskService.createTask(taskDto), HttpStatus.CREATED);
    }

    @GetMapping
    public ResponseEntity<?> getAllTasksByUserId(@PathVariable String userId,
                                                 @RequestParam Integer size,
                                                 @RequestParam String lastId,
                                                 @RequestParam String search) {
        return new ResponseEntity<>(taskService.getAllTasksByUserId(userId, size, lastId, search), HttpStatus.OK);
    }
}
