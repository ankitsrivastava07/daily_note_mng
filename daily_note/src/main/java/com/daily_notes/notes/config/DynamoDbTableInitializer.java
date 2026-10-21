
package com.daily_notes.notes.config;

import com.daily_notes.notes.entity.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbEnhancedClient;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbTable;
import software.amazon.awssdk.enhanced.dynamodb.TableSchema;
import software.amazon.awssdk.services.dynamodb.model.ResourceInUseException;

@Configuration
public class DynamoDbTableInitializer {

    private static final Logger log =
            LoggerFactory.getLogger(DynamoDbTableInitializer.class);

    private final DynamoDbEnhancedClient enhancedClient;

    @Value("${dynamodb.create-tables:false}")
    private boolean createTables;

    public DynamoDbTableInitializer(
            DynamoDbEnhancedClient enhancedClient) {
        this.enhancedClient = enhancedClient;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void createAllTables() {

        log.info("DynamoDB table initializer started. Enabled={}",
                createTables);

        if (!createTables) {
            log.info("Table creation disabled");
            return;
        }

        createTable("note", NoteEntity.class);
        createTable("short_note", ShortNoteEntity.class);
        createTable("work-space", WorkSpaceEntity.class);
        createTable("workspace-node", WorkspaceNodeEntity.class);
        createTable("task", TaskEntity.class);
        createTable("today_task", TodayTaskEntity.class);
        createTable("outbox_event", OutboxEventEntity.class);

        log.info("DynamoDB table initialization completed");
    }

    private <T> void createTable(
            String tableName,
            Class<T> entityClass) {

        log.info("Building schema: table={}, entity={}",
                tableName, entityClass.getSimpleName());

        try {
            TableSchema<T> schema = TableSchema.fromBean(entityClass);

            log.info("Schema built successfully: {}", tableName);

            DynamoDbTable<T> table =
                    enhancedClient.table(tableName, schema);

            log.info("Creating table: {}", tableName);
            table.createTable();

            log.info("Table created: {}", tableName);

        } catch (ResourceInUseException e) {
            log.info("Table already exists: {}", tableName);

        } catch (Exception e) {
            log.error(
                    "FAILED: table={}, entity={}, exception={}",
                    tableName,
                    entityClass.getName(),
                    e.getMessage(),
                    e
            );

            throw new IllegalStateException(
                    "DynamoDB initialization failed for table: "
                            + tableName
                            + ", entity: "
                            + entityClass.getSimpleName(),
                    e
            );
        }
    }
}
