package com.daily_notes.notes.dao;

import com.daily_notes.notes.entity.WorkSpaceEntity;

import java.util.List;
import java.util.Optional;

public interface WorkSpaceDao {

    void createWorkSpace(WorkSpaceEntity workSpaceEntity);

    List<WorkSpaceEntity> getAllWorkspaceByUserId(String userId);

    Optional<WorkSpaceEntity> getWorkspaceByTokenKey(String tokenKey);
}
