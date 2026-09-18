package com.daily_note.search_event_consumer.consumer;

import com.daily_note.search_event_consumer.dto.TaskEvent;
import com.daily_note.search_event_consumer.entity.TaskSearchDocument;
import com.daily_note.search_event_consumer.mapper.CustomMapper;
import com.daily_note.search_event_consumer.repository.TaskSearchDocumentRepo;
import org.jspecify.annotations.NonNull;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.support.Acknowledgment;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Service;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@Service
public class KafkaTaskEventConsumerService {

    private static final Logger logger =
            LoggerFactory.getLogger(KafkaTaskEventConsumerService.class);

    private final TaskSearchDocumentRepo taskSearchDocumentRepo;

    public KafkaTaskEventConsumerService(
            TaskSearchDocumentRepo taskSearchDocumentRepo) {
        this.taskSearchDocumentRepo = taskSearchDocumentRepo;
    }

    @KafkaListener(
            topics = "task-event",
            groupId = "task-search-group-v2"
    )
    public void consume(
            @Payload(required = false) String message,
            Acknowledgment acknowledgment) {
        logger.info("Received Message {}", message);

        try {
            ObjectMapper mapper = new ObjectMapper();
            JsonNode jsonNode = mapper.readTree(message);
        } catch (JacksonException e) {
            logger.info("Jackson Parsing Error: {} ", e.getLocalizedMessage());
        }

        try {

            TaskEvent event =
                    CustomMapper.mapJsonToEntity(
                            message,
                            TaskEvent.class
                    );

            logger.info(
                    "Kafka event received. eventId={}, eventType={}, taskId={}, userId={}",
                    event.getEventId(),
                    event.getEventType(),
                    event.getTaskId(),
                    event.getUserId()
            );

            switch (event.getEventType()) {

                case "TASK_CREATED":
                case "TASK_UPDATED":
                    saveTask(event);
                    break;

                case "TASK_DELETED":
                    deleteTask(event);
                    break;

                default:
                    throw new IllegalArgumentException(
                            "Unknown event type: " + event.getEventType()
                    );
            }

            acknowledgment.acknowledge();

            logger.info(
                    "Kafka message acknowledged. eventId={}, taskId={}",
                    event.getEventId(),
                    event.getTaskId()
            );

        } catch (Exception e) {
            logger.info("Kafka message processing failed. Message will not be acknowledged {}", e.getLocalizedMessage());
        }
    }

    private void saveTask(TaskEvent event) {

        TaskSearchDocument existing =
                taskSearchDocumentRepo
                        .findById(event.getTaskId())
                        .orElse(null);

        if (existing != null
                && existing.getVersion() != null
                && event.getVersion() != null
                && event.getVersion() <= existing.getVersion()) {

            logger.info(
                    "Duplicate/old event ignored. eventId={}, taskId={}, eventVersion={}, currentVersion={}",
                    event.getEventId(),
                    event.getTaskId(),
                    event.getVersion(),
                    existing.getVersion()
            );

            return;
        }

        TaskSearchDocument document = getTaskSearchDocument(event);
        taskSearchDocumentRepo.save(document);

        logger.info(
                "Task saved to Elasticsearch. taskId={}, userId={}, version={}",
                event.getTaskId(),
                event.getUserId(),
                event.getVersion()
        );
    }

    private static @NonNull TaskSearchDocument getTaskSearchDocument(TaskEvent event) {
        TaskSearchDocument document =
                new TaskSearchDocument();

        document.setDueDate(event.getDueDate());
        document.setDueTime(event.getDueTime());
        document.setUserId(event.getUserId());
        document.setTaskId(event.getTaskId());
        document.setName(event.getName());
        document.setContent(event.getContent());
        document.setPriority(event.getPriority());
        document.setStatus(event.getStatus());
        document.setVersion(event.getVersion());
        document.setCreatedAt(event.getCreatedAt());
        document.setMeridiem(event.getMeridiem());
        return document;
    }

    private void deleteTask(TaskEvent event) {

        taskSearchDocumentRepo.deleteById(
                event.getTaskId()
        );

        logger.info(
                "Task deleted from Elasticsearch. taskId={}, userId={}, eventId={}",
                event.getTaskId(),
                event.getUserId(),
                event.getEventId()
        );
    }
}