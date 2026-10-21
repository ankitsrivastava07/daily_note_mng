package com.daily_notes.notes.service;

import com.daily_notes.notes.dao.WorkSpaceDao;
import com.daily_notes.notes.dto.WorkSpaceDto;
import com.daily_notes.notes.entity.WorkSpaceEntity;
import com.daily_notes.notes.records.ApiResponse;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
public class WorkSpaceServiceImpl implements WorkSpaceService {

    private WorkSpaceDao workSpaceDao;

    public WorkSpaceServiceImpl(WorkSpaceDao workSpaceDao) {
        this.workSpaceDao = workSpaceDao;
    }

    public ApiResponse createWorkSpace(String userId, WorkSpaceDto dto) {
        WorkSpaceEntity entity = new WorkSpaceEntity();

        // CRITICAL: Explicitly set the partition key so DynamoDB doesn't throw a 400 error
        entity.setUserId(userId);

        // Set sort key (ID)
        entity.setId(UUID.randomUUID().toString());

        // Map other fields from DTO
        entity.setName(dto.name());
        entity.setAccessType(dto.accessType());
        entity.setCreatedBy(userId);

        workSpaceDao.createWorkSpace(entity);

        return new ApiResponse()
                .message("Success")
                .success(true);
    }

    @Override
    public void deleteWorkspaceByIdd(String workspaceId) throws UnsupportedOperationException {
        throw new UnsupportedOperationException("Not supported yet.");
    }

    @Override
    public ApiResponse getAllWorkspaceByUserId(String userId) {
        return new ApiResponse().data(workSpaceDao
                        .getAllWorkspaceByUserId(userId))
                .success(true)
                .message("Success");
    }

}
