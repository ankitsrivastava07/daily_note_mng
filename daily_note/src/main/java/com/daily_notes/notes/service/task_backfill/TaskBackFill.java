package com.daily_notes.notes.service.task_backfill;

import com.daily_notes.notes.entity.TaskEntity;
import com.daily_notes.notes.records.ApiResponse;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbEnhancedClient;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbTable;
import software.amazon.awssdk.enhanced.dynamodb.TableSchema;

@Service
public class TaskBackFill {

    private final DynamoDbTable<TaskEntity> table;

    public TaskBackFill(DynamoDbEnhancedClient client) {
        this.table = client.table("task", TableSchema.fromBean(TaskEntity.class));
    }

    public ApiResponse taskBackFill(String userId) {
        return new ApiResponse();
    }

}
