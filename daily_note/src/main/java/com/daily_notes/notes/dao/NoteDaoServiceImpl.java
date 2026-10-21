package com.daily_notes.notes.dao;

import com.daily_notes.notes.entity.NoteEntity;
import com.daily_notes.notes.utility.IdGenerator;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;
import software.amazon.awssdk.enhanced.dynamodb.*;
import software.amazon.awssdk.enhanced.dynamodb.model.QueryConditional;
import software.amazon.awssdk.enhanced.dynamodb.model.QueryEnhancedRequest;

import java.util.List;

@Repository
public class NoteDaoServiceImpl implements NoteDaoService {

    private DynamoDbTable<NoteEntity> dynamoDbTable;

    public NoteDaoServiceImpl(DynamoDbEnhancedClient enhancedClient) {
        this.dynamoDbTable = enhancedClient.table(
                "note",
                TableSchema.fromBean(NoteEntity.class)
        );
    }

    @Override
    public NoteEntity createNote(NoteEntity noteEntity) {
        noteEntity.setId(IdGenerator.generateId());
        dynamoDbTable.putItem(noteEntity);
        Key key = Key
                .builder()
                .partitionValue(noteEntity.getUserId())
                .sortValue(noteEntity.getId())
                .build();
        return dynamoDbTable.getItem(key);
    }

    @Override
    public void deleteNote(String noteId, String userId) {
        Key key = Key.builder()
                .partitionValue(userId) // Partition Key
                .sortValue(noteId)      // Sort Key
                .build();
        dynamoDbTable.deleteItem(key);
    }

    @Override
    public NoteEntity updateNote(NoteEntity noteEntity) {
        return dynamoDbTable.updateItem(noteEntity);
    }

    @Override
    public NoteEntity getNoteById(String noteId, String userId) {

        Key key = Key.builder()
                .partitionValue(userId)
                .sortValue(noteId)
                .build();

        return dynamoDbTable.getItem(key);
    }

    @Override
    public NoteEntity findByNoteKeyToken(String userId, String token) {
        DynamoDbIndex<NoteEntity> index =
                dynamoDbTable.index("user-noteKey-index");

        QueryConditional condition =
                QueryConditional.keyEqualTo(
                        Key.builder()
                                .partitionValue(userId)
                                .sortValue(token)
                                .build()
                );

        return index.query(condition)
                .stream()
                .flatMap(page -> page.items().stream())
                .findFirst()
                .orElse(null);
    }

    @Override
    public List<NoteEntity> getAllNotes(
            String userId, Pageable pageable) {
        QueryConditional condition =
                QueryConditional.keyEqualTo(
                        Key.builder()
                                .partitionValue(userId)
                                .build()
                );

        QueryEnhancedRequest request =
                QueryEnhancedRequest.builder()
                        .queryConditional(condition)
                        .build();

        return dynamoDbTable.query(request)
                .items()
                .stream()
                .toList();
    }
}
