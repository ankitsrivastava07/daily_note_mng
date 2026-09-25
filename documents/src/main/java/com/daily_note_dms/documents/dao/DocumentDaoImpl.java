package com.daily_note_dms.documents.dao;

import com.daily_note_dms.documents.entity.DocumentEntity;
import org.springframework.stereotype.Repository;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbEnhancedClient;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbTable;
import software.amazon.awssdk.enhanced.dynamodb.TableSchema;
import software.amazon.awssdk.enhanced.dynamodb.model.BatchWriteItemEnhancedRequest;
import software.amazon.awssdk.enhanced.dynamodb.model.WriteBatch;

import java.util.List;

@Repository
public class DocumentDaoImpl implements DocumentDao {

    private final DynamoDbTable<DocumentEntity> table;
    private final DynamoDbEnhancedClient enhancedClient;

    public DocumentDaoImpl(DynamoDbEnhancedClient enhancedClient) {
        this.enhancedClient = enhancedClient;
        this.table = enhancedClient.table(
                "documents",
                TableSchema.fromBean(DocumentEntity.class)
        );
    }

    /*@Override
    public DocumentEntity saveDocument(DocumentEntity fileEntity) {
        table.putItem(fileEntity);
        table.getItem(Key.builder().build().partitionKeyValue())
    }*/

    @Override
    public void saveDocument(
            List<DocumentEntity> fileEntities) {
        WriteBatch.Builder<DocumentEntity> writeBatch =
                WriteBatch.builder(DocumentEntity.class)
                        .mappedTableResource(table);

        fileEntities.forEach(e -> writeBatch
                .addPutItem(
                        b -> b.item(e)));

        BatchWriteItemEnhancedRequest request =
                BatchWriteItemEnhancedRequest.builder()
                        .writeBatches(writeBatch.build())
                        .build();

        enhancedClient.batchWriteItem(request);
    }

    @Override
    public List<DocumentEntity> getDocumentByReferenceId(String noteId) {
        return null;
    }
}
