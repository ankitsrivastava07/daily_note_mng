package com.daily_note.outbox_kafka_relay;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestHandler;
import com.amazonaws.services.lambda.runtime.events.DynamodbEvent;
import com.amazonaws.services.lambda.runtime.events.models.dynamodb.AttributeValue;
import org.apache.kafka.clients.producer.KafkaProducer;
import org.apache.kafka.clients.producer.ProducerRecord;
import org.apache.kafka.clients.producer.RecordMetadata;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.GetItemRequest;
import software.amazon.awssdk.services.dynamodb.model.GetItemResponse;
import software.amazon.awssdk.services.dynamodb.model.UpdateItemRequest;

import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Properties;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

public class OutboxStreamHandler
        implements RequestHandler<DynamodbEvent, String> {

    private static final String OUTBOX_TABLE =
            getRequiredEnvironmentVariable("OUTBOX_TABLE");

    private static final String KAFKA_TOPIC =
            getRequiredEnvironmentVariable("KAFKA_TOPIC");

    /*
     * These clients are created once per Lambda execution environment
     * and reused during warm invocations.
     */
    private static final KafkaProducer<String, String> KAFKA_PRODUCER =
            new KafkaProducer<>(createKafkaProperties());

    private static final DynamoDbClient DYNAMO_DB_CLIENT =
            DynamoDbClient.create();

    @Override
    public String handleRequest(
            DynamodbEvent dynamodbEvent,
            Context context) {

        if (dynamodbEvent == null ||
                dynamodbEvent.getRecords() == null ||
                dynamodbEvent.getRecords().isEmpty()) {

            context.getLogger().log(
                    "No DynamoDB Stream records received\n"
            );

            return "No records";
        }

        List<PendingPublish> pendingPublishes =
                new ArrayList<>();

        for (DynamodbEvent.DynamodbStreamRecord streamRecord :
                dynamodbEvent.getRecords()) {

            /*
             * Creating an outbox item produces INSERT.
             * Updating PENDING to PUBLISHED produces MODIFY,
             * which must not be sent to Kafka again.
             */
            if (!"INSERT".equals(streamRecord.getEventName())) {
                continue;
            }

            if (streamRecord.getDynamodb() == null) {
                continue;
            }

            Map<String, AttributeValue> newImage =
                    streamRecord.getDynamodb().getNewImage();

            if (newImage == null || newImage.isEmpty()) {
                continue;
            }

            String eventId =
                    getStringValue(newImage, "id");

            String eventType =
                    getStringValue(newImage, "eventType");

            String taskId =
                    getStringValue(newImage, "taskId");

            String userId =
                    getStringValue(newImage, "userId");

            String payload =
                    getStringValue(newImage, "payload");

            validateOutboxRecord(
                    eventId,
                    eventType,
                    taskId,
                    payload
            );

            /*
             * When the trigger uses TRIM_HORIZON, DynamoDB may send
             * historical INSERT records. Check the current item status
             * so records already marked PUBLISHED are skipped.
             */
            if (!isCurrentlyPending(eventId)) {
                context.getLogger().log(
                        "Skipping non-pending event: eventId="
                                + eventId + "\n"
                );

                continue;
            }

            String kafkaPayload =
                    createKafkaEnvelope(
                            eventId,
                            eventType,
                            taskId,
                            userId,
                            payload
                    );

            ProducerRecord<String, String> kafkaRecord =
                    new ProducerRecord<>(
                            KAFKA_TOPIC,
                            taskId,
                            kafkaPayload
                    );

            Future<RecordMetadata> result =
                    KAFKA_PRODUCER.send(kafkaRecord);

            pendingPublishes.add(
                    new PendingPublish(
                            eventId,
                            taskId,
                            result
                    )
            );
        }

        /*
         * Wait for Kafka confirmation before updating DynamoDB.
         */
        for (PendingPublish pending : pendingPublishes) {
            try {
                RecordMetadata metadata =
                        pending.result()
                                .get(20, TimeUnit.SECONDS);

                markAsPublished(
                        pending.eventId()
                );

                context.getLogger().log(
                        "Published Outbox event: eventId="
                                + pending.eventId()
                                + ", taskId="
                                + pending.taskId()
                                + ", topic="
                                + metadata.topic()
                                + ", partition="
                                + metadata.partition()
                                + ", offset="
                                + metadata.offset()
                                + "\n"
                );

            } catch (Exception exception) {
                throw new IllegalStateException(
                        "Unable to publish Outbox event: eventId="
                                + pending.eventId(),
                        exception
                );
            }
        }

        KAFKA_PRODUCER.flush();

        return "Published events: " +
                pendingPublishes.size();
    }

    /*
     * Converts the raw task JSON stored in payload into the event
     * structure expected by the Kafka consumer.
     *
     * No ObjectMapper or Jackson dependency is required.
     */
    private static String createKafkaEnvelope(
            String eventId,
            String eventType,
            String taskId,
            String userId,
            String payload) {

        if (payload == null || payload.isBlank()) {
            throw new IllegalArgumentException(
                    "Outbox payload is empty: eventId="
                            + eventId
            );
        }

        String taskJson = payload.trim();

        if (!taskJson.startsWith("{") ||
                !taskJson.endsWith("}")) {

            throw new IllegalArgumentException(
                    "Outbox payload is not a JSON object: eventId="
                            + eventId
            );
        }

        /*
         * Remove only the opening and closing braces.
         * Everything inside remains valid JSON.
         */
        String taskProperties =
                taskJson.substring(
                        1,
                        taskJson.length() - 1
                ).trim();

        StringBuilder eventJson =
                new StringBuilder("{");

        eventJson.append("\"eventId\":\"")
                .append(escapeJson(eventId))
                .append("\",");

        eventJson.append("\"eventType\":\"")
                .append(escapeJson(eventType))
                .append("\",");

        eventJson.append("\"taskId\":\"")
                .append(escapeJson(taskId))
                .append("\"");

        /*
         * Most task payloads already contain userId.
         * Add it only when it is absent.
         */
        if (!taskJson.contains("\"userId\"") &&
                userId != null &&
                !userId.isBlank()) {

            eventJson.append(",\"userId\":\"")
                    .append(escapeJson(userId))
                    .append("\"");
        }

        if (!taskProperties.isBlank()) {
            eventJson.append(",")
                    .append(taskProperties);
        }

        /*
         * Existing payloads may not contain a version.
         * TASK_CREATED starts from version 1.
         */
        if (!taskJson.contains("\"version\"")) {
            eventJson.append(",\"version\":1");
        }

        eventJson.append("}");

        return eventJson.toString();
    }

    private static boolean isCurrentlyPending(
            String eventId) {

        GetItemRequest request =
                GetItemRequest.builder()
                        .tableName(OUTBOX_TABLE)
                        .key(Map.of(
                                "id",
                                software.amazon.awssdk.services.dynamodb.model.AttributeValue
                                        .builder()
                                        .s(eventId)
                                        .build()
                        ))
                        .consistentRead(true)
                        .projectionExpression("#status")
                        .expressionAttributeNames(
                                Map.of(
                                        "#status",
                                        "status"
                                )
                        )
                        .build();

        GetItemResponse response =
                DYNAMO_DB_CLIENT.getItem(request);

        if (!response.hasItem()) {
            return false;
        }

        software.amazon.awssdk.services.dynamodb.model.AttributeValue
                statusAttribute =
                response.item().get("status");

        return statusAttribute != null &&
                "PENDING".equalsIgnoreCase(
                        statusAttribute.s()
                );
    }

    private static void markAsPublished(
            String eventId) {

        Map<String,
                software.amazon.awssdk.services.dynamodb.model.AttributeValue>
                values = new HashMap<>();

        values.put(
                ":published",
                software.amazon.awssdk.services.dynamodb.model.AttributeValue
                        .builder()
                        .s("PUBLISHED")
                        .build()
        );

        values.put(
                ":pending",
                software.amazon.awssdk.services.dynamodb.model.AttributeValue
                        .builder()
                        .s("PENDING")
                        .build()
        );

        values.put(
                ":publishedAt",
                software.amazon.awssdk.services.dynamodb.model.AttributeValue
                        .builder()
                        .s(Instant.now().toString())
                        .build()
        );

        UpdateItemRequest request =
                UpdateItemRequest.builder()
                        .tableName(OUTBOX_TABLE)
                        .key(Map.of(
                                "id",
                                software.amazon.awssdk.services.dynamodb.model.AttributeValue
                                        .builder()
                                        .s(eventId)
                                        .build()
                        ))
                        .updateExpression(
                                "SET #status = :published, " +
                                        "publishedAt = :publishedAt"
                        )
                        .conditionExpression(
                                "#status = :pending"
                        )
                        .expressionAttributeNames(
                                Map.of(
                                        "#status",
                                        "status"
                                )
                        )
                        .expressionAttributeValues(values)
                        .build();

        DYNAMO_DB_CLIENT.updateItem(request);
    }

    private static void validateOutboxRecord(
            String eventId,
            String eventType,
            String taskId,
            String payload) {

        if (eventId == null || eventId.isBlank()) {
            throw new IllegalArgumentException(
                    "Outbox event ID is missing"
            );
        }

        if (eventType == null || eventType.isBlank()) {
            throw new IllegalArgumentException(
                    "Outbox event type is missing: eventId="
                            + eventId
            );
        }

        if (taskId == null || taskId.isBlank()) {
            throw new IllegalArgumentException(
                    "Outbox task ID is missing: eventId="
                            + eventId
            );
        }

        if (payload == null || payload.isBlank()) {
            throw new IllegalArgumentException(
                    "Outbox payload is missing: eventId="
                            + eventId
            );
        }
    }

    private static String getStringValue(
            Map<String, AttributeValue> image,
            String attributeName) {

        AttributeValue value =
                image.get(attributeName);

        if (value == null) {
            return null;
        }

        return value.getS();
    }

    private static String escapeJson(
            String value) {

        if (value == null) {
            return "";
        }

        return value
                .replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\b", "\\b")
                .replace("\f", "\\f")
                .replace("\n", "\\n")
                .replace("\r", "\\r")
                .replace("\t", "\\t");
    }

    private static Properties createKafkaProperties() {

        String kafkaCaLocation =
                prepareKafkaCaCertificate();

        String bootstrapServers =
                getRequiredEnvironmentVariable(
                        "KAFKA_BOOTSTRAP_SERVERS"
                );

        String username =
                getRequiredEnvironmentVariable(
                        "KAFKA_USERNAME"
                );

        String password =
                getRequiredEnvironmentVariable(
                        "KAFKA_PASSWORD"
                );

        Properties properties =
                new Properties();

        properties.put(
                "bootstrap.servers",
                bootstrapServers
        );

        properties.put(
                "security.protocol",
                "SASL_SSL"
        );

        properties.put(
                "sasl.mechanism",
                "SCRAM-SHA-256"
        );

        properties.put(
                "sasl.jaas.config",
                "org.apache.kafka.common.security.scram.ScramLoginModule " +
                        "required username=\"" +
                        escapeJaasValue(username) +
                        "\" password=\"" +
                        escapeJaasValue(password) +
                        "\";"
        );

        properties.put(
                "ssl.truststore.location",
                kafkaCaLocation
        );

        properties.put(
                "ssl.truststore.type",
                "PEM"
        );

        properties.put(
                "ssl.endpoint.identification.algorithm",
                "https"
        );

        properties.put(
                "key.serializer",
                "org.apache.kafka.common.serialization.StringSerializer"
        );

        properties.put(
                "value.serializer",
                "org.apache.kafka.common.serialization.StringSerializer"
        );

        properties.put("acks", "all");
        properties.put("enable.idempotence", "true");
        properties.put(
                "retries",
                Integer.toString(Integer.MAX_VALUE)
        );
        properties.put(
                "max.in.flight.requests.per.connection",
                "5"
        );
        properties.put(
                "delivery.timeout.ms",
                "20000"
        );
        properties.put(
                "request.timeout.ms",
                "10000"
        );
        properties.put(
                "linger.ms",
                "10"
        );
        properties.put(
                "compression.type",
                "gzip"
        );
        properties.put(
                "client.id",
                "outbox-kafka-relay"
        );

        return properties;
    }

    private static String prepareKafkaCaCertificate() {

        Path certificatePath =
                Path.of("/tmp/kafka-ca.pem");

        try {
            if (Files.notExists(certificatePath)) {

                try (InputStream inputStream =
                             OutboxStreamHandler.class
                                     .getClassLoader()
                                     .getResourceAsStream(
                                             "kafka-ca.pem"
                                     )) {

                    if (inputStream == null) {
                        throw new IllegalStateException(
                                "kafka-ca.pem not found in JAR"
                        );
                    }

                    Files.copy(
                            inputStream,
                            certificatePath,
                            StandardCopyOption.REPLACE_EXISTING
                    );
                }
            }

            return certificatePath.toString();

        } catch (Exception exception) {
            throw new IllegalStateException(
                    "Unable to prepare Kafka CA certificate",
                    exception
            );
        }
    }

    private static String getRequiredEnvironmentVariable(
            String name) {

        String value = "create_event_task";

        if (value == null || value.isBlank()) {
            throw new IllegalStateException(
                    "Missing environment variable: "
                            + name
            );
        }

        return value;
    }

    private static String escapeJaasValue(
            String value) {

        return value
                .replace("\\", "\\\\")
                .replace("\"", "\\\"");
    }

    private record PendingPublish(
            String eventId,
            String taskId,
            Future<RecordMetadata> result) {
    }
}