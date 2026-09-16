package com.daily_notes.notes.service;

import com.daily_notes.notes.dao.WorkspaceNodeDaoImpl;
import com.daily_notes.notes.dto.CreateWorkspaceNodeDto;
import com.daily_notes.notes.entity.WorkspaceNodeEntity;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class WorkspaceNodeService {

    private final WorkspaceNodeDaoImpl dao;

    public WorkspaceNodeService(WorkspaceNodeDaoImpl dao) {
        this.dao = dao;
    }

    public WorkspaceNodeEntity createNode(String workspaceId, CreateWorkspaceNodeDto dto) {
        WorkspaceNodeEntity entity = new WorkspaceNodeEntity();
        entity.setId(UUID.randomUUID().toString());
        entity.setWorkspaceId(workspaceId);
        entity.setParentId(
                dto.getParentId() == null || dto.getParentId().isBlank()
                        ? "ROOT"
                        : dto.getParentId()
        );

        entity.setName(dto.getName());
        entity.setType(dto.getType());
        entity.setContent(dto.getContent());
        dao.save(entity);
        return entity;
    }

    public List<WorkspaceNodeEntity> getNodes(
            String workspaceId,
            String parentId) {

        String parent =
                parentId == null || parentId.isBlank()
                        ? "ROOT"
                        : parentId;

        return dao.getByWorkspaceId(workspaceId)
                .stream()
                .filter(node -> parent.equals(node.getParentId()))
                .toList();
    }
}