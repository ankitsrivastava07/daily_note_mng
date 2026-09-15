package com.daily_notes.notes.controller.workspace.v1;

import com.daily_notes.notes.dto.WorkSpaceDto;
import com.daily_notes.notes.service.WorkSpaceService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("api/v1/user/{userId}/work-space")
public class WorkspaceController {

    private final WorkSpaceService workSpaceService;

    public WorkspaceController(WorkSpaceService workSpaceService) {
        this.workSpaceService = workSpaceService;
    }

    @PostMapping
    public ResponseEntity<?> createWorkSpace(@RequestBody WorkSpaceDto workSpaceDto) {
        return new ResponseEntity<>(workSpaceService.createWorkSpace(workSpaceDto),
                HttpStatus.CREATED);
    }

    @GetMapping("/{workSpaceId}")
    public ResponseEntity<?> getWorkSpaceById(@PathVariable String workSpaceId) {
        return new ResponseEntity<>(HttpStatus.NOT_IMPLEMENTED);
    }

    @DeleteMapping("/{workSpaceId}")
    public ResponseEntity<?> deleteWorkSpaceById(@PathVariable String workSpaceId) {
        return new ResponseEntity<>(HttpStatus.NOT_IMPLEMENTED);
    }

    @GetMapping
    public ResponseEntity<?> getAllWorkspaceByUserId(@PathVariable String userId) {
        return new ResponseEntity<>(workSpaceService.getAllWorkspaceByUserId(userId), HttpStatus.OK);
    }

}
