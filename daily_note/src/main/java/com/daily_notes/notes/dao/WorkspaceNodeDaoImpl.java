package com.daily_notes.notes.dao;

import com.daily_notes.notes.entity.WorkspaceNodeEntity;
import org.springframework.stereotype.Repository;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbEnhancedClient;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbTable;
import software.amazon.awssdk.enhanced.dynamodb.Key;
import software.amazon.awssdk.enhanced.dynamodb.TableSchema;
import software.amazon.awssdk.enhanced.dynamodb.model.QueryConditional;

import java.util.List;

@Repository
public class WorkspaceNodeDaoImpl {

    private final DynamoDbTable<WorkspaceNodeEntity> table;

    public WorkspaceNodeDaoImpl(DynamoDbEnhancedClient client) {
        this.table = client.table(
                "workspace-node",
                TableSchema.fromBean(WorkspaceNodeEntity.class)
        );
    }

    public void save(WorkspaceNodeEntity entity) {
        table.putItem(entity);
    }

    public List<WorkspaceNodeEntity> getByWorkspaceId(String workspaceId) {

        return table.query(
                        QueryConditional.keyEqualTo(
                                Key.builder()
                                        .partitionValue(workspaceId)
                                        .build()
                        )
                )
                .items()
                .stream()
                .toList();
    }
}