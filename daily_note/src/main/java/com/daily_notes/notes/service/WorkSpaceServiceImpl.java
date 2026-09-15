package com.daily_notes.notes.service;

import com.daily_notes.notes.dao.WorkSpaceDao;
import com.daily_notes.notes.dto.WorkSpaceDto;
import com.daily_notes.notes.entity.WorkSpaceEntity;
import com.daily_notes.notes.mapper.CustomMapper;
import com.daily_notes.notes.records.ApiResponse;
import org.springframework.stereotype.Service;

@Service
public class WorkSpaceServiceImpl implements WorkSpaceService {

    private WorkSpaceDao workSpaceDao;

    public WorkSpaceServiceImpl(WorkSpaceDao workSpaceDao) {
        this.workSpaceDao = workSpaceDao;
    }

    @Override
    public ApiResponse createWorkSpace(WorkSpaceDto workSpaceDto) {
        WorkSpaceEntity entity = CustomMapper.mapToEntity(workSpaceDto, WorkSpaceEntity.class);
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
