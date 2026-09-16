package com.daily_notes.notes.service;

import com.daily_notes.notes.dto.TaskEvent;
import com.daily_notes.notes.entity.OutboxEventEntity;
import com.daily_notes.notes.entity.TaskEntity;
import com.daily_notes.notes.event.OutboxEventService;
import com.daily_notes.notes.mapper.CustomMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbEnhancedClient;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbTable;
import software.amazon.awssdk.enhanced.dynamodb.Key;
import software.amazon.awssdk.enhanced.dynamodb.TableSchema;

import java.util.List;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;

@Component
@EnableScheduling
@ConditionalOnProperty(
        name = "outbox.scheduler.enabled",
        havingValue = "true",
        matchIfMissing = false
)
public class OutboxEventScheduler {

    private static final Logger logger =
            LoggerFactory.getLogger(OutboxEventScheduler.class);

    private final OutboxEventService outboxEventService;
    private final KafkaTemplate<String, String> kafkaTemplate;
    private final DynamoDbTable<TaskEntity> table;

    public OutboxEventScheduler(
            OutboxEventService outboxEventService,
            KafkaTemplate<String, String> kafkaTemplate, DynamoDbEnhancedClient client) {

        this.outboxEventService = outboxEventService;
        this.kafkaTemplate = kafkaTemplate;
        this.table = client.table(
                "task",
                TableSchema.fromBean(TaskEntity.class)
        );
    }

    @Transactional
    @Scheduled(fixedDelay = 5000)
    public void publishPendingEvents() {

        try {

            List<OutboxEventEntity> events =
                    outboxEventService.getPendingEvents();

            if (events == null || events.isEmpty()) {
                logger.debug("No pending outbox events found");
                return;
            }

            logger.info(
                    "Found {} pending outbox events",
                    events.size()
            );

            for (OutboxEventEntity event : events) {

                publishEvent(event);
            }

        } catch (Exception e) {

            logger.error(
                    "Error while processing outbox events",
                    e
            );
        }
    }

    private void publishEvent(OutboxEventEntity event) {

        try {

            logger.info(
                    "Publishing outbox event. eventId={}, taskId={}, eventType={}",
                    event.getId(),
                    event.getTaskId(),
                    event.getEventType()
            );

            TaskEntity taskEntity = table.getItem(Key.builder()
                    .partitionValue(event.getUserId())
                    .sortValue(event.getTaskId())
                    .build());

            TaskEvent taskEvent = new TaskEvent();
            taskEvent.setEventType(event.getEventType());
            taskEvent.setMeridiem(taskEntity.getMeridiem());
            taskEvent.setUserId(event.getUserId());
            taskEvent.setTaskId(event.getTaskId());
            taskEvent.setContent(taskEntity.getContent());
            taskEvent.setPriority(taskEntity.getPriority());
            taskEvent.setStatus(taskEntity.getStatus());
            taskEvent.setName(taskEntity.getName());
            taskEvent.setEventId(event.getId());
            taskEvent.setVersion(1L);
            taskEvent.setCreatedAt(taskEntity.getCreatedAt());
            taskEvent.setDueDate(taskEntity.getDueDate());
            taskEvent.setDueTime(taskEntity.getDueTime());

            logger.info("Task Event CREATE Request {}", taskEvent);
            kafkaTemplate.send(
                    "task-event",
                    event.getTaskId(),
                    CustomMapper.mapToJson(taskEvent)
            ).get();

            outboxEventService.markAsPublished(
                    event.getId()
            );

            logger.info(
                    "Outbox event published successfully. eventId={}, taskId={}",
                    event.getId(),
                    event.getTaskId()
            );

        } catch (Exception e) {

            logger.error(
                    "Failed to publish outbox event. eventId={}, taskId={}",
                    event.getId(),
                    event.getTaskId(),
                    e
            );
        }
    }
}