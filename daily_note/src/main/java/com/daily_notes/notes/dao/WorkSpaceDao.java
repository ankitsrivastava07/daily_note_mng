package com.daily_notes.notes.dao;

import com.daily_notes.notes.entity.WorkSpaceEntity;
import java.util.List;

public interface WorkSpaceDao {

    void createWorkSpace(WorkSpaceEntity workSpaceEntity);

    List<WorkSpaceEntity> getAllWorkspaceByUserId(String userId);
}
