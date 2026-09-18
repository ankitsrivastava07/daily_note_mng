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
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ObjectNode;

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
            requiredEnvironmentVariable("OUTBOX_TABLE");

    private static final String KAFKA_TOPIC =
            requiredEnvironmentVariable("KAFKA_TOPIC");

    private static final ObjectMapper OBJECT_MAPPER =
            new ObjectMapper();

    private static final KafkaProducer<String, String> KAFKA_PRODUCER =
            new KafkaProducer<>(createKafkaProperties());

    private static final DynamoDbClient DYNAMO_DB_CLIENT =
            DynamoDbClient.create();

    @Override
    public String handleRequest(
            DynamodbEvent event,
            Context context) {

        if (event == null ||
                event.getRecords() == null ||
                event.getRecords().isEmpty()) {

            context.getLogger().log(
                    "No DynamoDB Stream records received\n"
            );

            return "No records";
        }

        List<PendingPublish> pendingPublishes =
                new ArrayList<>();

        for (DynamodbEvent.DynamodbStreamRecord streamRecord :
                event.getRecords()) {

            /*
             * Outbox records are created using INSERT.
             * Status changes generate MODIFY and must be ignored.
             */
            if (!"INSERT".equals(streamRecord.getEventName())) {
                continue;
            }

            Map<String, AttributeValue> newImage =
                    streamRecord.getDynamodb().getNewImage();

            if (newImage == null || newImage.isEmpty()) {
                continue;
            }

            String eventId =
                    stringValue(newImage, "id");

            String eventType =
                    stringValue(newImage, "eventType");

            String taskId =
                    stringValue(newImage, "taskId");

            String userId =
                    stringValue(newImage, "userId");

            String payload =
                    stringValue(newImage, "payload");

            validateOutboxRecord(
                    eventId,
                    eventType,
                    taskId,
                    payload
            );

            /*
             * TRIM_HORIZON may deliver older INSERT records whose
             * current database status is already PUBLISHED.
             */
            if (!isCurrentlyPending(eventId)) {
                context.getLogger().log(
                        "Skipping already processed event: eventId="
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
         * Confirm every Kafka publish before updating DynamoDB.
         */
        for (PendingPublish pending : pendingPublishes) {
            try {
                RecordMetadata metadata =
                        pending.result()
                                .get(20, TimeUnit.SECONDS);

                markAsPublished(pending.eventId());

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

        return "Published events: " + pendingPublishes.size();
    }

    private static String createKafkaEnvelope(
            String eventId,
            String eventType,
            String taskId,
            String userId,
            String payload) {

        try {
            JsonNode payloadNode =
                    OBJECT_MAPPER.readTree(payload);

            if (payloadNode == null || !payloadNode.isObject()) {
                throw new IllegalArgumentException(
                        "Outbox payload must be a JSON object"
                );
            }

            ObjectNode envelope =
                    ((ObjectNode) payloadNode).deepCopy();

            /*
             * The raw task payload contains "id".
             * The consumer expects "taskId".
             */
            envelope.remove("id");

            envelope.put("eventId", eventId);
            envelope.put("eventType", eventType);
            envelope.put("taskId", taskId);

            if (userId != null && !userId.isBlank()) {
                envelope.put("userId", userId);
            }

            /*
             * Existing payloads may not have a version.
             * TASK_CREATED begins at version 1.
             */
            if (!envelope.has("version")) {
                envelope.put("version", 1);
            }

            return OBJECT_MAPPER.writeValueAsString(
                    envelope
            );

        } catch (Exception exception) {
            throw new IllegalArgumentException(
                    "Unable to create Kafka event envelope: eventId="
                            + eventId,
                    exception
            );
        }
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
                                Map.of("#status", "status")
                        )
                        .build();

        GetItemResponse response =
                DYNAMO_DB_CLIENT.getItem(request);

        if (!response.hasItem()) {
            return false;
        }

        software.amazon.awssdk.services.dynamodb.model.AttributeValue status =
                response.item().get("status");

        return status != null &&
                "PENDING".equalsIgnoreCase(status.s());
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
                                Map.of("#status", "status")
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
                    "Outbox eventId is missing"
            );
        }

        if (eventType == null || eventType.isBlank()) {
            throw new IllegalArgumentException(
                    "Outbox eventType is missing: eventId=" + eventId
            );
        }

        if (taskId == null || taskId.isBlank()) {
            throw new IllegalArgumentException(
                    "Outbox taskId is missing: eventId=" + eventId
            );
        }

        if (payload == null || payload.isBlank()) {
            throw new IllegalArgumentException(
                    "Outbox payload is missing: eventId=" + eventId
            );
        }
    }

    private static String stringValue(
            Map<String, AttributeValue> image,
            String name) {

        AttributeValue value = image.get(name);

        return value == null ? null : value.getS();
    }

    private static Properties createKafkaProperties() {

        Properties properties = new Properties();

        properties.put(
                "bootstrap.servers",
                requiredEnvironmentVariable(
                        "KAFKA_BOOTSTRAP_SERVERS"
                )
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
                        escapeJaasValue(
                                requiredEnvironmentVariable(
                                        "KAFKA_USERNAME"
                                )
                        ) +
                        "\" password=\"" +
                        escapeJaasValue(
                                requiredEnvironmentVariable(
                                        "KAFKA_PASSWORD"
                                )
                        ) +
                        "\";"
        );

        properties.put(
                "ssl.truststore.location",
                prepareKafkaCaCertificate()
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
        properties.put("retries", Integer.toString(Integer.MAX_VALUE));
        properties.put("max.in.flight.requests.per.connection", "5");
        properties.put("delivery.timeout.ms", "20000");
        properties.put("request.timeout.ms", "10000");
        properties.put("linger.ms", "10");
        properties.put("compression.type", "gzip");
        properties.put("client.id", "outbox-kafka-relay");

        return properties;
    }

    private static Path prepareKafkaCaCertificate() {

        Path target =
                Path.of("/tmp/kafka-ca.pem");

        try {
            if (Files.notExists(target)) {
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
                            target,
                            StandardCopyOption.REPLACE_EXISTING
                    );
                }
            }

            return target;

        } catch (Exception exception) {
            throw new IllegalStateException(
                    "Unable to prepare Kafka CA certificate",
                    exception
            );
        }
    }

    private static String requiredEnvironmentVariable(
            String name) {

        String value = System.getenv(name);

        if (value == null || value.isBlank()) {
            throw new IllegalStateException(
                    "Missing environment variable: " + name
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
}package com.daily_note.outbox_kafka_relay;

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
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ObjectNode;

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
            requiredEnvironmentVariable("OUTBOX_TABLE");

    private static final String KAFKA_TOPIC =
            requiredEnvironmentVariable("KAFKA_TOPIC");

    private static final ObjectMapper OBJECT_MAPPER =
            new ObjectMapper();

    private static final KafkaProducer<String, String> KAFKA_PRODUCER =
            new KafkaProducer<>(createKafkaProperties());

    private static final DynamoDbClient DYNAMO_DB_CLIENT =
            DynamoDbClient.create();

    @Override
    public String handleRequest(
            DynamodbEvent event,
            Context context) {

        if (event == null ||
                event.getRecords() == null ||
                event.getRecords().isEmpty()) {

            context.getLogger().log(
                    "No DynamoDB Stream records received\n"
            );

            return "No records";
        }

        List<PendingPublish> pendingPublishes =
                new ArrayList<>();

        for (DynamodbEvent.DynamodbStreamRecord streamRecord :
                event.getRecords()) {

            /*
             * Outbox records are created using INSERT.
             * Status changes generate MODIFY and must be ignored.
             */
            if (!"INSERT".equals(streamRecord.getEventName())) {
                continue;
            }

            Map<String, AttributeValue> newImage =
                    streamRecord.getDynamodb().getNewImage();

            if (newImage == null || newImage.isEmpty()) {
                continue;
            }

            String eventId =
                    stringValue(newImage, "id");

            String eventType =
                    stringValue(newImage, "eventType");

            String taskId =
                    stringValue(newImage, "taskId");

            String userId =
                    stringValue(newImage, "userId");

            String payload =
                    stringValue(newImage, "payload");

            validateOutboxRecord(
                    eventId,
                    eventType,
                    taskId,
                    payload
            );

            /*
             * TRIM_HORIZON may deliver older INSERT records whose
             * current database status is already PUBLISHED.
             */
            if (!isCurrentlyPending(eventId)) {
                context.getLogger().log(
                        "Skipping already processed event: eventId="
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
         * Confirm every Kafka publish before updating DynamoDB.
         */
        for (PendingPublish pending : pendingPublishes) {
            try {
                RecordMetadata metadata =
                        pending.result()
                                .get(20, TimeUnit.SECONDS);

                markAsPublished(pending.eventId());

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

        return "Published events: " + pendingPublishes.size();
    }

    private static String createKafkaEnvelope(
            String eventId,
            String eventType,
            String taskId,
            String userId,
            String payload) {

        try {
            JsonNode payloadNode =
                    OBJECT_MAPPER.readTree(payload);

            if (payloadNode == null || !payloadNode.isObject()) {
                throw new IllegalArgumentException(
                        "Outbox payload must be a JSON object"
                );
            }

            ObjectNode envelope =
                    ((ObjectNode) payloadNode).deepCopy();

            /*
             * The raw task payload contains "id".
             * The consumer expects "taskId".
             */
            envelope.remove("id");

            envelope.put("eventId", eventId);
            envelope.put("eventType", eventType);
            envelope.put("taskId", taskId);

            if (userId != null && !userId.isBlank()) {
                envelope.put("userId", userId);
            }

            /*
             * Existing payloads may not have a version.
             * TASK_CREATED begins at version 1.
             */
            if (!envelope.has("version")) {
                envelope.put("version", 1);
            }

            return OBJECT_MAPPER.writeValueAsString(
                    envelope
            );

        } catch (Exception exception) {
            throw new IllegalArgumentException(
                    "Unable to create Kafka event envelope: eventId="
                            + eventId,
                    exception
            );
        }
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
                                Map.of("#status", "status")
                        )
                        .build();

        GetItemResponse response =
                DYNAMO_DB_CLIENT.getItem(request);

        if (!response.hasItem()) {
            return false;
        }

        software.amazon.awssdk.services.dynamodb.model.AttributeValue status =
                response.item().get("status");

        return status != null &&
                "PENDING".equalsIgnoreCase(status.s());
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
                                Map.of("#status", "status")
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
                    "Outbox eventId is missing"
            );
        }

        if (eventType == null || eventType.isBlank()) {
            throw new IllegalArgumentException(
                    "Outbox eventType is missing: eventId=" + eventId
            );
        }

        if (taskId == null || taskId.isBlank()) {
            throw new IllegalArgumentException(
                    "Outbox taskId is missing: eventId=" + eventId
            );
        }

        if (payload == null || payload.isBlank()) {
            throw new IllegalArgumentException(
                    "Outbox payload is missing: eventId=" + eventId
            );
        }
    }

    private static String stringValue(
            Map<String, AttributeValue> image,
            String name) {

        AttributeValue value = image.get(name);

        return value == null ? null : value.getS();
    }

    private static Properties createKafkaProperties() {

        Properties properties = new Properties();

        properties.put(
                "bootstrap.servers",
                requiredEnvironmentVariable(
                        "KAFKA_BOOTSTRAP_SERVERS"
                )
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
                        escapeJaasValue(
                                requiredEnvironmentVariable(
                                        "KAFKA_USERNAME"
                                )
                        ) +
                        "\" password=\"" +
                        escapeJaasValue(
                                requiredEnvironmentVariable(
                                        "KAFKA_PASSWORD"
                                )
                        ) +
                        "\";"
        );

        properties.put(
                "ssl.truststore.location",
                prepareKafkaCaCertificate()
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
        properties.put("retries", Integer.toString(Integer.MAX_VALUE));
        properties.put("max.in.flight.requests.per.connection", "5");
        properties.put("delivery.timeout.ms", "20000");
        properties.put("request.timeout.ms", "10000");
        properties.put("linger.ms", "10");
        properties.put("compression.type", "gzip");
        properties.put("client.id", "outbox-kafka-relay");

        return properties;
    }

    private static Path prepareKafkaCaCertificate() {

        Path target =
                Path.of("/tmp/kafka-ca.pem");

        try {
            if (Files.notExists(target)) {
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
                            target,
                            StandardCopyOption.REPLACE_EXISTING
                    );
                }
            }

            return target;

        } catch (Exception exception) {
            throw new IllegalStateException(
                    "Unable to prepare Kafka CA certificate",
                    exception
            );
        }
    }

    private static String requiredEnvironmentVariable(
            String name) {

        String value = System.getenv(name);

        if (value == null || value.isBlank()) {
            throw new IllegalStateException(
                    "Missing environment variable: " + name
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