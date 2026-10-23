package com.daily_notes.notes.service;

import com.daily_notes.notes.dao.WorkSpaceDao;
import com.daily_notes.notes.dto.WorkSpaceDto;
import com.daily_notes.notes.entity.WorkSpaceEntity;
import com.daily_notes.notes.exceptions.exception.WorkSpaceAlreadyExistException;
import com.daily_notes.notes.records.ApiResponse;
import com.daily_notes.notes.utility.constant.TokenUtil;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbIndex;
import software.amazon.awssdk.enhanced.dynamodb.Key;
import software.amazon.awssdk.enhanced.dynamodb.model.QueryConditional;
import software.amazon.awssdk.enhanced.dynamodb.model.QueryEnhancedRequest;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class WorkSpaceServiceImpl implements WorkSpaceService {

    private WorkSpaceDao workSpaceDao;

    public WorkSpaceServiceImpl(WorkSpaceDao workSpaceDao) {
        this.workSpaceDao = workSpaceDao;
    }

    public ApiResponse createWorkSpace(String userId, WorkSpaceDto dto) {
        String token = TokenUtil.generateToken(userId, dto.name());
        if (workSpaceDao.getWorkspaceByTokenKey(token).isPresent()) {
            throw new WorkSpaceAlreadyExistException("Workspace with the same name already exists.");
        }

        WorkSpaceEntity entity = new WorkSpaceEntity();
        entity.setUserId(userId);
        entity.setId(UUID.randomUUID().toString());
        entity.setName(dto.name());
        entity.setAccessType(dto.accessType());
        entity.setCreatedBy(userId);
        entity.setTokenKey(token);
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
