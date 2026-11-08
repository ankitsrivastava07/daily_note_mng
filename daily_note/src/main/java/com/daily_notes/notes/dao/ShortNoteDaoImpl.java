package com.daily_notes.notes.dao;

import com.daily_notes.notes.entity.ShortNoteEntity;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Repository;
import software.amazon.awssdk.enhanced.dynamodb.*;
import software.amazon.awssdk.enhanced.dynamodb.model.Page;
import software.amazon.awssdk.enhanced.dynamodb.model.QueryConditional;
import software.amazon.awssdk.enhanced.dynamodb.model.QueryEnhancedRequest;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;

import java.util.Collections;
import java.util.Iterator;
import java.util.Map;

@Repository
public class ShortNoteDaoImpl implements ShortNoteDao {
    private final DynamoDbTable<ShortNoteEntity> table;

    private final Logger logger = LoggerFactory.getLogger(ShortNoteDaoImpl.class.getName());

    public ShortNoteDaoImpl(DynamoDbEnhancedClient enhancedClient) {
        this.table = enhancedClient.table("short_note", TableSchema.fromBean(ShortNoteEntity.class));
    }

    @Override
    public ShortNoteEntity createShortNote(ShortNoteEntity shortNoteEntity) {
        table.putItem(shortNoteEntity);
        return table.getItem(Key.builder()
                .partitionValue(shortNoteEntity.getUserId()).
                sortValue(shortNoteEntity.getUniqueToken())
                .build());
    }

    @Override
    public ShortNoteEntity findByHashToken(String userId, String uniqueToken) {
        DynamoDbIndex<ShortNoteEntity> index = table.index("UserUniqueTokenIndex");
        QueryConditional condition = QueryConditional.keyEqualTo(Key.builder().partitionValue(userId).sortValue(uniqueToken).build());
        return index.query(r -> r.queryConditional(condition)).stream().flatMap(page ->
                        page.items().stream())
                .findFirst()
                .orElse(null);
    }

    @Override
    public ShortNoteEntity getShortNoteById(String userId, String shortNoteId) {
        ShortNoteEntity entity = table.getItem(Key.builder().partitionValue(userId).sortValue(shortNoteId).build());
        return entity;
    }

    @Override
    public Page<ShortNoteEntity> getAllShortNotes(String userId, int limit, Map<String, AttributeValue> lastEvaluatedKey) {
        DynamoDbIndex<ShortNoteEntity> index = table.index("shortnote_createdAt_index");
        QueryEnhancedRequest.Builder requestBuilder = QueryEnhancedRequest.builder().queryConditional(QueryConditional.keyEqualTo(Key.builder().partitionValue(userId).build())).scanIndexForward(false).limit(limit);
        if (lastEvaluatedKey != null && !lastEvaluatedKey.isEmpty()) {
            requestBuilder.exclusiveStartKey(lastEvaluatedKey);
        }
        Iterator<Page<ShortNoteEntity>> iterator = index.query(requestBuilder.build()).iterator();
        if (!iterator.hasNext()) {
            return Page.create(Collections.emptyList(), null);
        }
        return iterator.next();
    }

    @Override
    public void deleteShortNoteById(String userId, String noteId) {
        ShortNoteEntity entity = table.getItem(Key.builder().partitionValue(userId).sortValue(noteId).build());
        logger.info("Retrieved entity for deletion: {}", entity);

        table.deleteItem(
                Key.builder()
                        .partitionValue(userId)
                        .sortValue(noteId)
                        .build()
        );
        logger.info("Short note deleted successfully for Short Note Id : {}", entity.getId());
    }
}