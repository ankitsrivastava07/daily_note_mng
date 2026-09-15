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

    @Value("${dynamodb.create-tables:true}")
    private boolean createTables;

    public DynamoDbTableInitializer(
            DynamoDbEnhancedClient enhancedClient) {

        this.enhancedClient = enhancedClient;

        log.info("DynamoDbTableInitializer bean created");
    }

    @EventListener(ApplicationReadyEvent.class)
    public void createAllTables() {

        log.info("======================================");
        log.info("DynamoDB TABLE INITIALIZER STARTED");
        log.info("dynamodb.create-tables = {}", createTables);
        log.info("======================================");

        if (!createTables) {
            log.warn("DynamoDB table creation is DISABLED");
            return;
        }

        createTable("note", NoteEntity.class);
        createTable("short_note", ShortNoteEntity.class);
        createTable("work-space", WorkSpaceEntity.class);
        createTable("workspace-node", WorkspaceNodeEntity.class);
        createTable("task", TaskEntity.class);
        createTable("today_task", TodayTaskEntity.class);
        createTable("outbox_event", OutboxEventEntity.class);

        log.info("======================================");
        log.info("DynamoDB TABLE INITIALIZER COMPLETED");
        log.info("======================================");
    }

    private <T> void createTable(
            String tableName,
            Class<T> entityClass) {

        try {

            DynamoDbTable<T> table =
                    enhancedClient.table(
                            tableName,
                            TableSchema.fromBean(entityClass)
                    );

            log.info("Creating/checking table: {}", tableName);

            table.createTable();

            log.info("DynamoDB TABLE CREATED -> {}", tableName);

        } catch (ResourceInUseException e) {

            log.info(
                    "DynamoDB TABLE ALREADY EXISTS -> {}",
                    tableName
            );

        } catch (Exception e) {

            log.error(
                    "FAILED TO CREATE TABLE -> {}",
                    tableName,
                    e
            );

            throw e;
        }
    }
}