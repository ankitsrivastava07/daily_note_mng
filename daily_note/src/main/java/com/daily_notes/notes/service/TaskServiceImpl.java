package com.daily_notes.notes.service;

import com.daily_notes.notes.dao.TaskDaoService;
import com.daily_notes.notes.dto.TaskDto;
import com.daily_notes.notes.entity.OutboxEventEntity;
import com.daily_notes.notes.entity.TaskEntity;
import com.daily_notes.notes.mapper.CustomMapper;
import com.daily_notes.notes.records.ApiResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbEnhancedClient;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbTable;
import software.amazon.awssdk.enhanced.dynamodb.TableSchema;
import software.amazon.awssdk.enhanced.dynamodb.model.TransactWriteItemsEnhancedRequest;

import java.time.Instant;
import java.util.UUID;

import static com.daily_notes.notes.utility.constant.ApiResponseConstant.API_RESPONSE_SUCCESS;

@Service
public class TaskServiceImpl implements TaskService {

    private static final Logger logger =
            LoggerFactory.getLogger(TaskServiceImpl.class);

    private final TaskDaoService taskDaoService;
    private final DynamoDbEnhancedClient enhancedClient;
    private final DynamoDbTable<TaskEntity> taskTable;
    private final DynamoDbTable<OutboxEventEntity> outboxTable;

    public TaskServiceImpl(
            TaskDaoService taskDaoService,
            DynamoDbEnhancedClient enhancedClient) {

        this.taskDaoService = taskDaoService;
        this.enhancedClient = enhancedClient;

        this.taskTable = enhancedClient.table(
                "task",
                TableSchema.fromBean(TaskEntity.class)
        );

        this.outboxTable = enhancedClient.table(
                "outbox_event",
                TableSchema.fromBean(OutboxEventEntity.class)
        );
    }

    @Override
    public ApiResponse createTask(TaskDto taskDto) {

        String userId = taskDto.userId();
        String taskId = UUID.randomUUID().toString();
        String eventId = UUID.randomUUID().toString();

        TaskEntity taskEntity =
                CustomMapper.mapToEntity(
                        taskDto,
                        TaskEntity.class
                );

        taskEntity.setCreatedAt(Instant.now());
        taskEntity.setUpdateAt(Instant.now());
        taskEntity.setId(taskId);
        taskEntity.setUserId(userId);

        OutboxEventEntity event =
                new OutboxEventEntity();

        event.setId(eventId);
        event.setUserId(userId);
        event.setTaskId(taskId);
        event.setEventType("TASK_CREATED");
        event.setPayload(
                CustomMapper.mapToJson(taskEntity)
        );
        event.setStatus("PENDING");

        TransactWriteItemsEnhancedRequest transaction =
                TransactWriteItemsEnhancedRequest.builder()
                        .addPutItem(taskTable, taskEntity)
                        .addPutItem(outboxTable, event)
                        .build();

        enhancedClient.transactWriteItems(transaction);

        logger.info(
                "Task and Outbox created: userId={}, taskId={}, eventId={}",
                userId,
                taskId,
                eventId
        );

        return new ApiResponse()
                .success(Boolean.TRUE)
                .message(API_RESPONSE_SUCCESS)
                .data(taskEntity);
    }

    @Override
    public ApiResponse getAllTasksByUserId(String userId, Integer limit, String lastId, String search) {
        return null;
    }
}