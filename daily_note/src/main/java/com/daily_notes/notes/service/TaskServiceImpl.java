package com.daily_notes.notes.service;

import com.daily_notes.notes.dao.TaskDaoService;
import com.daily_notes.notes.dto.TaskDto;
import com.daily_notes.notes.entity.OutboxEventEntity;
import com.daily_notes.notes.entity.TaskEntity;
import com.daily_notes.notes.event.OutboxEventService;
import com.daily_notes.notes.mapper.CustomMapper;
import com.daily_notes.notes.records.ApiResponse;
import com.daily_notes.notes.utility.IdGenerator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbEnhancedClient;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbTable;
import software.amazon.awssdk.enhanced.dynamodb.TableSchema;
import software.amazon.awssdk.enhanced.dynamodb.model.Page;

import java.time.Instant;
import java.util.List;

import static com.daily_notes.notes.utility.constant.ApiResponseConstant.API_RESPONSE_SUCCESS;

@Service
public class TaskServiceImpl implements TaskService {

    @Autowired
    private TaskDaoService taskDaoService;
    Logger logger = LoggerFactory.getLogger("");

    private final DynamoDbTable<OutboxEventEntity> table;

    public TaskServiceImpl(DynamoDbEnhancedClient client) {
        this.table = client.table("outbox_event", TableSchema.fromBean(OutboxEventEntity.class));
    }

    @Override
    public ApiResponse createTask(String userId, TaskDto taskDto) {
        TaskEntity taskEntity = CustomMapper.mapToEntity(taskDto, TaskEntity.class);
        taskEntity.setId(IdGenerator.generateId());
        taskEntity.setUserId(userId);
        taskEntity.setSlugName(taskEntity.getName().toLowerCase());
        taskDaoService.createTask(taskEntity);
        logger.info("Task created for user {}: {}", userId, taskDto);
        OutboxEventEntity event = new OutboxEventEntity();
        event.setId(IdGenerator.generateId());
        event.setUserId(userId);
        event.setEventType("TASK_CREATED");
        event.setPayload(CustomMapper.mapToJson(taskEntity));
        event.setTaskId(taskEntity.getId());
        event.setStatus("PENDING");

        table.putItem(event);
        logger.info("Event created for user {}: {}", userId, event);
        return new ApiResponse().success(Boolean.TRUE).message(API_RESPONSE_SUCCESS);
    }


    @Override
    public ApiResponse getAllTasksByUserId(String userId, Integer limit, String lastId, String search) {
        long start = System.currentTimeMillis();
        Page<TaskEntity> tasks = taskDaoService.getAllTasksByUserId(userId, limit, lastId, search);
        logger.info("Retrieved all tasks for user {}", userId);
        long end = System.currentTimeMillis();
        logger.info("Get All Task Api execution time is {}", end - start);
        return new ApiResponse()
                .success(Boolean.TRUE)
                .message("Success")
                .data(tasks.items());
    }

}
