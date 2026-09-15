package com.daily_notes.notes.dao;

import com.daily_notes.notes.entity.WorkSpaceEntity;
import com.daily_notes.notes.utility.IdGenerator;
import org.springframework.stereotype.Repository;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbEnhancedClient;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbTable;
import software.amazon.awssdk.enhanced.dynamodb.Key;
import software.amazon.awssdk.enhanced.dynamodb.TableSchema;
import software.amazon.awssdk.enhanced.dynamodb.model.QueryConditional;

import java.util.List;

@Repository
public class WorkSpaceDaoImpl implements WorkSpaceDao {

    private DynamoDbTable<WorkSpaceEntity> table;

    public WorkSpaceDaoImpl(DynamoDbEnhancedClient dynamoDbEnhancedClient) {
        this.table = dynamoDbEnhancedClient.table("work-space", TableSchema.fromBean(WorkSpaceEntity.class));
    }

    @Override
    public void createWorkSpace(WorkSpaceEntity workSpaceEntity) {
        workSpaceEntity.setId(IdGenerator.generateId());
        table.putItem(workSpaceEntity);
    }

    @Override
    public List<WorkSpaceEntity> getAllWorkspaceByUserId(String userId) {
        QueryConditional queryConditional = QueryConditional
                .keyEqualTo(Key.builder()
                        .partitionValue(userId)
                        .build());

        return table.query(queryConditional).items()
                .stream().toList();
    }
}
