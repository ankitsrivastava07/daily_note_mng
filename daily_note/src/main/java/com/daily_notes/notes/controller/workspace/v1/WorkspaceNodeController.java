package com.daily_notes.notes.controller.workspace.v1;

import com.daily_notes.notes.dto.CreateWorkspaceNodeDto;
import com.daily_notes.notes.entity.WorkspaceNodeEntity;
import com.daily_notes.notes.service.WorkspaceNodeService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/workspaces/{workspaceId}/nodes")
public class WorkspaceNodeController {

    private final WorkspaceNodeService workspaceNodeService;

    public WorkspaceNodeController(
            WorkspaceNodeService workspaceNodeService) {
        this.workspaceNodeService = workspaceNodeService;
    }

    @PostMapping
    public WorkspaceNodeEntity createNode(
            @PathVariable String workspaceId,
            @RequestBody CreateWorkspaceNodeDto request) {

        return workspaceNodeService.createNode(
                workspaceId,
                request
        );
    }

    @GetMapping
    public List<WorkspaceNodeEntity> getNodes(
            @PathVariable String workspaceId,
            @RequestParam(defaultValue = "ROOT") String parentId) {

        return workspaceNodeService.getNodes(
                workspaceId,
                parentId
        );
    }
}