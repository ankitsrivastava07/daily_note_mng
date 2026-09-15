package com.daily_notes.notes.dao;

import com.daily_notes.notes.entity.ShortNoteEntity;
import com.daily_notes.notes.utility.IdGenerator;
import org.springframework.stereotype.Repository;
import software.amazon.awssdk.enhanced.dynamodb.*;
import software.amazon.awssdk.enhanced.dynamodb.model.Page;
import software.amazon.awssdk.enhanced.dynamodb.model.QueryConditional;
import software.amazon.awssdk.enhanced.dynamodb.model.QueryEnhancedRequest;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;

import java.util.Map;

@Repository
public class ShortNoteDaoImpl implements ShortNoteDao {

    private final DynamoDbTable<ShortNoteEntity> table;

    public ShortNoteDaoImpl(DynamoDbEnhancedClient enhancedClient) {
        this.table = enhancedClient.table(
                "short_note",
                TableSchema.fromBean(ShortNoteEntity.class)
        );
    }

    @Override
    public void createShortNote(ShortNoteEntity shortNoteEntity) {
        shortNoteEntity.setId(IdGenerator.generateId());
        table.putItem(shortNoteEntity);
    }

    @Override
    public Page<ShortNoteEntity> getAllShortNotes(
            String userId,
            int limit,
            Map<String, AttributeValue> lastEvaluatedKey) {

        // 1. Query on Partition Key (userId)
        QueryConditional condition = QueryConditional.keyEqualTo(
                Key.builder().partitionValue(userId).build()
        );

        QueryEnhancedRequest.Builder builder = QueryEnhancedRequest.builder()
                .queryConditional(
                        QueryConditional.keyEqualTo(
                                Key.builder()
                                        .partitionValue(userId)
                                        .build()
                        )
                )
                .scanIndexForward(false) // newest createdAt first
                .limit(limit);

        if (lastEvaluatedKey != null && !lastEvaluatedKey.isEmpty()) {
            builder.exclusiveStartKey(lastEvaluatedKey);
        }

        // 3. Execute Query
        return table.query(builder.build()).iterator().next();
    }

    @Override
    public void deleteShortNoteById(String category, String userId, String noteId) {
        /*table.deleteItem(Key.builder())
                .partitionValue(userId)
                .sortValue(noteId)
                .build()
        );*/
    }
}