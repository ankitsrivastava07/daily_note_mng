package com.daily_notes.notes.dao;

import com.daily_notes.notes.entity.TaskEntity;
import com.daily_notes.notes.utility.IdGenerator;
import org.slf4j.Logger;
import org.springframework.stereotype.Repository;
import software.amazon.awssdk.enhanced.dynamodb.*;
import software.amazon.awssdk.enhanced.dynamodb.model.Page;
import software.amazon.awssdk.enhanced.dynamodb.model.QueryConditional;
import software.amazon.awssdk.enhanced.dynamodb.model.QueryEnhancedRequest;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;

import java.util.*;

@Repository
public class TaskDaoServiceImpl implements TaskDaoService {

    private final DynamoDbTable<TaskEntity> table;
    Logger logger = org.slf4j.LoggerFactory.getLogger(TaskDaoServiceImpl.class);

    public TaskDaoServiceImpl(DynamoDbEnhancedClient client) {
        this.table = client.table("task", TableSchema.fromBean(TaskEntity.class));
    }

    @Override
    public void createTask(TaskEntity taskEntity) {
        taskEntity.setId(IdGenerator.generateId());
        table.putItem(taskEntity);
        logger.info("Task created for user {}: {}", taskEntity.getUserId(), taskEntity);
    }

    @Override
    public Page<TaskEntity> getAllTasksByUserId(
            String userId,
            Integer limit,
            String lastId,
            String search) {

        logger.info("Retrieving all tasks for user {} with limit {}, lastId {}, and search {}", userId, limit, lastId, search);
        QueryEnhancedRequest.Builder queryBuilder =
                QueryEnhancedRequest.builder()
                        .queryConditional(
                                QueryConditional.keyEqualTo(
                                        Key.builder()
                                                .partitionValue(userId)
                                                .build()
                                )
                        )
                        .scanIndexForward(false);

        // =========================
        // START KEY
        // =========================
        if (lastId != null && !lastId.isBlank()) {

            Map<String, AttributeValue> startKey = new HashMap<>();

            startKey.put(
                    "userId",
                    AttributeValue.builder()
                            .s(userId)
                            .build()
            );

            startKey.put(
                    "id",
                    AttributeValue.builder()
                            .s(lastId)
                            .build()
            );

            queryBuilder.exclusiveStartKey(startKey);
        }

        // =========================
        // FILTER
        // =========================

        if (search != null && !search.isBlank()) {

            Map<String, String> expressionNames = new HashMap<>();

            expressionNames.put("#name", "name");
            expressionNames.put("#content", "content");
            expressionNames.put("#priority", "priority");
            expressionNames.put("#status", "status");

            Map<String, AttributeValue> expressionValues =
                    new HashMap<>();

            expressionValues.put(
                    ":search",
                    AttributeValue.builder()
                            .s(search.trim())
                            .build()
            );

            Expression filterExpression =
                    Expression.builder()
                            .expression(
                                    "contains(#name, :search) " +
                                            "OR contains(#content, :search) " +
                                            "OR contains(#priority, :search) " +
                                            "OR contains(#status, :search)"
                            )
                            .expressionNames(expressionNames)
                            .expressionValues(expressionValues)
                            .build();

            queryBuilder.filterExpression(filterExpression);
        }

        List<TaskEntity> result = new ArrayList<>();

        Map<String, AttributeValue> lastEvaluatedKey = null;

        do {

            QueryEnhancedRequest.Builder pageQuery =
                    queryBuilder.limit(limit);

            if (lastEvaluatedKey != null && !lastEvaluatedKey.isEmpty()) {
                pageQuery.exclusiveStartKey(lastEvaluatedKey);
            }

            Page<TaskEntity> page =
                    table.query(pageQuery.build())
                            .iterator()
                            .next();

            result.addAll(page.items());

            lastEvaluatedKey = page.lastEvaluatedKey();

        } while (
                result.size() < limit &&
                        lastEvaluatedKey != null &&
                        !lastEvaluatedKey.isEmpty()
        );

        // only return requested limit
        if (result.size() > limit) {
            result = result.subList(0, limit);
        }

        lastEvaluatedKey = lastEvaluatedKey == null ? Collections.emptyMap() : lastEvaluatedKey;
        return Page.<TaskEntity>builder(TaskEntity.class)
                .items(result)
                .lastEvaluatedKey(lastEvaluatedKey)
                .build();
    }
}
