package com.daily_notes.notes.dao;

import com.daily_notes.notes.entity.TaskEntity;
import software.amazon.awssdk.enhanced.dynamodb.model.Page;

public interface TaskDaoService {

    void createTask(TaskEntity taskEntity);

    Page<TaskEntity> getAllTasksByUserId(String userId, Integer limit, String lastId, String search);
}
