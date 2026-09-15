package com.daily_notes.notes.event.dao;

import com.daily_notes.notes.entity.OutboxEventEntity;
import org.springframework.stereotype.Repository;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbEnhancedClient;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbTable;
import software.amazon.awssdk.enhanced.dynamodb.TableSchema;
import software.amazon.awssdk.enhanced.dynamodb.model.ScanEnhancedRequest;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;
import software.amazon.awssdk.enhanced.dynamodb.Expression;

import java.util.List;

@Repository
public class OutboxEventDaoServiceImpl
        implements OutboxEventDaoService {

    private final DynamoDbTable<OutboxEventEntity> table;

    public OutboxEventDaoServiceImpl(
            DynamoDbEnhancedClient client) {

        this.table = client.table(
                "outbox_event",
                TableSchema.fromBean(OutboxEventEntity.class)
        );
    }

    @Override
    public void save(OutboxEventEntity event) {
        table.putItem(event);
    }

    @Override
    public List<OutboxEventEntity> getPendingEvents() {
        Expression filterExpression =
                Expression.builder()
                        .expression("#status = :status")
                        .putExpressionName("#status", "status")
                        .putExpressionValue(
                                ":status",
                                AttributeValue.builder()
                                        .s("PENDING")
                                        .build()
                        )
                        .build();

        ScanEnhancedRequest request =
                ScanEnhancedRequest.builder()
                        .filterExpression(filterExpression)
                        .limit(50)
                        .build();

        return table.scan(request)
                .items()
                .stream()
                .toList();
    }

    @Override
    public void markAsPublished(String eventId) {

        OutboxEventEntity event =
                table.getItem(r ->
                        r.key(k ->
                                k.partitionValue(eventId)
                        )
                );

        if (event == null) {
            return;
        }

        event.setStatus("PUBLISHED");
        table.updateItem(event);
    }
}