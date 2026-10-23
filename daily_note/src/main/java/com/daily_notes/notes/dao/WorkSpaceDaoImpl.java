package com.daily_notes.notes.dao;

import com.daily_notes.notes.entity.WorkSpaceEntity;
import com.daily_notes.notes.utility.IdGenerator;
import org.springframework.stereotype.Repository;
import software.amazon.awssdk.enhanced.dynamodb.*;
import software.amazon.awssdk.enhanced.dynamodb.model.QueryConditional;
import software.amazon.awssdk.enhanced.dynamodb.model.QueryEnhancedRequest;

import java.util.List;
import java.util.Optional;

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
        QueryConditional condition = QueryConditional.keyEqualTo(
                Key.builder()
                        .partitionValue(userId)
                        .build()
        );

        QueryEnhancedRequest request = QueryEnhancedRequest.builder()
                .queryConditional(condition)
                .build();

        return table.query(request).items().stream().toList();
    }

    @Override
    public Optional<WorkSpaceEntity> getWorkspaceByTokenKey(String tokenKey) {

        DynamoDbIndex<WorkSpaceEntity> index =
                table.index("token_key");

        QueryEnhancedRequest request = QueryEnhancedRequest.builder()
                .queryConditional(
                        QueryConditional.keyEqualTo(
                                Key.builder()
                                        .partitionValue(tokenKey)
                                        .build()
                        )
                )
                .limit(1)
                .build();

        return index.query(request)
                .stream()
                .flatMap(page -> page.items().stream())
                .map(Optional::of)
                .findFirst()
                .orElse(Optional.empty());
    }
}
