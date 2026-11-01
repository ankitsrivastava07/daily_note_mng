package com.daily_notes.notes.service;

import com.daily_notes.notes.utility.constant.TokenUtil;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.*;

import java.util.Map;

@Component
@ConditionalOnProperty(
        name = "workspace.token-migration.enabled",
        havingValue = "true"
)
public class WorkspaceTokenMigration implements CommandLineRunner {

    private static final Logger log =
            LoggerFactory.getLogger(WorkspaceTokenMigration.class);

    private final DynamoDbClient dynamoDbClient;

    @Value("${aws.dynamodb.workspace-table}")
    private String tableName;

    @Value("${workspace.token-migration.dry-run:true}")
    private boolean dryRun;

    public WorkspaceTokenMigration(DynamoDbClient dynamoDbClient) {
        this.dynamoDbClient = dynamoDbClient;
    }

    @Override
    public void run(String... args) {
        log.info("Workspace token migration started. dryRun={}", dryRun);

        int scanned = 0;
        int updated = 0;
        int skipped = 0;

        ScanRequest scanRequest = ScanRequest.builder()
                .tableName(tableName)
                .build();

        // Automatically handles DynamoDB pagination.
        for (ScanResponse page :
                dynamoDbClient.scanPaginator(scanRequest)) {

            for (Map<String, AttributeValue> item : page.items()) {
                scanned++;

                String userId = getString(item, "user_id");
                String id = getString(item, "id");
                String name = getString(item, "name");
                String existingToken = getString(item, "token_key");

                if (isBlank(userId) || isBlank(id) || isBlank(name)) {
                    skipped++;
                    log.warn(
                            "Skipping record with missing user_id, id or name"
                    );
                    continue;
                }

                if (!isBlank(existingToken)) {
                    skipped++;
                    continue;
                }

                // Use exactly the same generator as your existing service.
                String token = TokenUtil.generateToken(userId, name);

                if (dryRun) {
                    log.info(
                            "DRY RUN: would update workspace id={} userId={}",
                            id, userId
                    );
                    updated++;
                    continue;
                }

                try {
                    dynamoDbClient.updateItem(
                            UpdateItemRequest.builder()
                                    .tableName(tableName)
                                    .key(Map.of(
                                            "user_id", AttributeValue.builder()
                                                    .s(userId).build(),
                                            "id", AttributeValue.builder()
                                                    .s(id).build()
                                    ))
                                    .updateExpression("SET #tk = :token")
                                    .conditionExpression(
                                            "attribute_not_exists(#tk) OR #tk = :empty"
                                    )
                                    .expressionAttributeNames(Map.of(
                                            "#tk", "token_key"
                                    ))
                                    .expressionAttributeValues(Map.of(
                                            ":token", AttributeValue.builder()
                                                    .s(token).build(),
                                            ":empty", AttributeValue.builder()
                                                    .s("").build()
                                    ))
                                    .build()
                    );

                    updated++;

                } catch (ConditionalCheckFailedException ex) {
                    // Another request may have populated the token.
                    skipped++;
                    log.info(
                            "Workspace already updated; skipping id={}", id
                    );
                }
            }
        }

        log.info(
                "Migration finished. scanned={}, updated={}, skipped={}, dryRun={}",
                scanned, updated, skipped, dryRun
        );
    }

    private static String getString(
            Map<String, AttributeValue> item, String key) {
        AttributeValue value = item.get(key);
        return value == null || value.s() == null ? null : value.s();
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
