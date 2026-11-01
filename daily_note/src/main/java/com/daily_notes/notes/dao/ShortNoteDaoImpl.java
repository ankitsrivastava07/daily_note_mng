package com.daily_notes.notes.dao;

import com.daily_notes.notes.entity.ShortNoteEntity;
import com.daily_notes.notes.utility.IdGenerator;
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
    public ShortNoteEntity findByHashToken(String userId, String uniqueToken) {
        DynamoDbIndex<ShortNoteEntity> index =
                table.index("UserUniqueTokenIndex");

        QueryConditional condition = QueryConditional.keyEqualTo(
                Key.builder()
                        .partitionValue(userId)
                        .sortValue(uniqueToken)
                        .build()
        );

        return index.query(r -> r.queryConditional(condition))
                .stream()
                .flatMap(page -> page.items().stream())
                .findFirst()
                .orElse(null);
    }


    @Override
    public Page<ShortNoteEntity> getAllShortNotes(
            String userId,
            int limit,
            Map<String, AttributeValue> lastEvaluatedKey) {

        // Query GSI instead of the primary table
        DynamoDbIndex<ShortNoteEntity> index =
                table.index("shortnote_createdAt_index");

        QueryEnhancedRequest.Builder builder =
                QueryEnhancedRequest.builder()
                        .queryConditional(
                                QueryConditional.keyEqualTo(
                                        Key.builder()
                                                .partitionValue(userId)
                                                .build()
                                )
                        )
                        // Latest createdAt first
                        .scanIndexForward(false)
                        .limit(limit);

        // Continue from the previous page
        if (lastEvaluatedKey != null &&
                !lastEvaluatedKey.isEmpty()) {

            builder.exclusiveStartKey(lastEvaluatedKey);
        }

        // Execute DynamoDB query
        Iterator<Page<ShortNoteEntity>> iterator =
                index.query(builder.build()).iterator();

        if (!iterator.hasNext()) {
            return Page.create(
                    Collections.emptyList(),
                    null
            );
        }

        return iterator.next();
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