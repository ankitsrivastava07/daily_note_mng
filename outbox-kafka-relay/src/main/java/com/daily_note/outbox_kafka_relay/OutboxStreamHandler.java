package com.daily_note.outbox_kafka_relay;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestHandler;
import com.amazonaws.services.lambda.runtime.events.DynamodbEvent;
import com.amazonaws.services.lambda.runtime.events.models.dynamodb.AttributeValue;
import org.apache.kafka.clients.producer.KafkaProducer;
import org.apache.kafka.clients.producer.ProducerRecord;
import org.apache.kafka.clients.producer.RecordMetadata;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
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
     * Created once per Lambda execution environment.
     * Warm invocations reuse these clients.
     */
    private static final KafkaProducer<String, String>
            KAFKA_PRODUCER =
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
                    "No DynamoDB Stream records received"
            );

            return "No records";
        }

        List<PendingOutboxRecord> pendingRecords =
                new ArrayList<>();

        List<Future<RecordMetadata>> kafkaResults =
                new ArrayList<>();

        for (DynamodbEvent.DynamodbStreamRecord streamRecord :
                dynamodbEvent.getRecords()) {

            /*
             * Only process newly created Outbox records.
             * Ignore MODIFY events created after status updates.
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
                    getStringValue(newImage, "id");

            String taskId =
                    getStringValue(newImage, "taskId");

            String payload =
                    getStringValue(newImage, "payload");

            String status =
                    getStringValue(newImage, "status");

            if (!"PENDING".equalsIgnoreCase(status)) {
                context.getLogger().log(
                        "Ignoring non-pending event: eventId="
                                + eventId
                );

                continue;
            }

            if (eventId == null ||
                    eventId.isBlank() ||
                    taskId == null ||
                    taskId.isBlank() ||
                    payload == null ||
                    payload.isBlank()) {

                throw new IllegalArgumentException(
                        "Invalid Outbox record: eventId="
                                + eventId
                );
            }

            ProducerRecord<String, String> kafkaRecord =
                    new ProducerRecord<>(
                            KAFKA_TOPIC,
                            taskId,
                            payload
                    );

            kafkaResults.add(
                    KAFKA_PRODUCER.send(kafkaRecord)
            );

            pendingRecords.add(
                    new PendingOutboxRecord(
                            eventId,
                            taskId
                    )
            );
        }

        /*
         * Wait for every Kafka publish before marking Outbox records
         * as PUBLISHED.
         */
        for (int index = 0;
             index < kafkaResults.size();
             index++) {

            try {
                RecordMetadata metadata =
                        kafkaResults.get(index)
                                .get(20, TimeUnit.SECONDS);

                PendingOutboxRecord outbox =
                        pendingRecords.get(index);

                markAsPublished(outbox.eventId());

                context.getLogger().log(
                        "Published Outbox event: eventId="
                                + outbox.eventId()
                                + ", taskId="
                                + outbox.taskId()
                                + ", topic="
                                + metadata.topic()
                                + ", partition="
                                + metadata.partition()
                                + ", offset="
                                + metadata.offset()
                );

            } catch (Exception exception) {

                /*
                 * Throwing causes DynamoDB Streams/Lambda to retry.
                 */
                throw new IllegalStateException(
                        "Unable to publish Outbox event",
                        exception
                );
            }
        }

        KAFKA_PRODUCER.flush();

        return "Published events: " +
                pendingRecords.size();
    }

    private static Properties createKafkaProperties() {

        String kafkaCaLocation = prepareKafkaCaCertificate();

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

        Properties properties = new Properties();

        properties.put(
                "bootstrap.servers",
                bootstrapServers
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

    private static void markAsPublished(
            String eventId) {

        Map<String,
                software.amazon.awssdk.services.dynamodb.model.AttributeValue>
                key = Map.of(
                "id",
                software.amazon.awssdk.services.dynamodb.model.AttributeValue
                        .builder()
                        .s(eventId)
                        .build()
        );

        Map<String, String> attributeNames =
                Map.of(
                        "#status",
                        "status"
                );

        Map<String,
                software.amazon.awssdk.services.dynamodb.model.AttributeValue>
                attributeValues =
                new HashMap<>();

        attributeValues.put(
                ":published",
                software.amazon.awssdk.services.dynamodb.model.AttributeValue
                        .builder()
                        .s("PUBLISHED")
                        .build()
        );

        attributeValues.put(
                ":publishedAt",
                software.amazon.awssdk.services.dynamodb.model.AttributeValue
                        .builder()
                        .s(Instant.now().toString())
                        .build()
        );

        UpdateItemRequest request =
                UpdateItemRequest.builder()
                        .tableName(OUTBOX_TABLE)
                        .key(key)
                        .updateExpression(
                                "SET #status = :published, " +
                                        "publishedAt = :publishedAt"
                        )
                        .expressionAttributeNames(
                                attributeNames
                        )
                        .expressionAttributeValues(
                                attributeValues
                        )
                        .build();

        DYNAMO_DB_CLIENT.updateItem(request);
    }

    private static String getStringValue(
            Map<String, AttributeValue> image,
            String attributeName) {

        AttributeValue attributeValue =
                image.get(attributeName);

        if (attributeValue == null) {
            return null;
        }

        return attributeValue.getS();
    }

    private static String getRequiredEnvironmentVariable(
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

    private record PendingOutboxRecord(
            String eventId,
            String taskId) {
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
}