package com.daily_notes.notes.service;

import com.daily_notes.notes.dto.WorkSpaceDto;
import com.daily_notes.notes.records.ApiResponse;

public interface WorkSpaceService {

    ApiResponse createWorkSpace(String userId,WorkSpaceDto workSpaceDto);

    void deleteWorkspaceByIdd(String workspaceId) throws UnsupportedOperationException;

    ApiResponse getAllWorkspaceByUserId(String userId);
}
