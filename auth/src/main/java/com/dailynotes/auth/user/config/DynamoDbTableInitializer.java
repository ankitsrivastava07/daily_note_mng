package com.dailynotes.auth.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.*;

import java.util.List;

@Component
public class DynamoDbTableInitializer implements ApplicationRunner {

    private final DynamoDbClient dynamoDbClient;

    @Value("${aws.dynamodb.users-table:Users}")
    private String tableName;

    public DynamoDbTableInitializer(DynamoDbClient dynamoDbClient) {
        this.dynamoDbClient = dynamoDbClient;
    }

    @Override
    public void run(ApplicationArguments args) {

        try {
            dynamoDbClient.describeTable(
                    DescribeTableRequest.builder()
                            .tableName(tableName)
                            .build()
            );

            System.out.println("DynamoDB table already exists: " + tableName);
            return;

        } catch (ResourceNotFoundException exception) {
            System.out.println("Creating DynamoDB table: " + tableName);
        }

        CreateTableRequest request = CreateTableRequest.builder()
                .tableName(tableName)
                .attributeDefinitions(
                        AttributeDefinition.builder()
                                .attributeName("user_id")
                                .attributeType(ScalarAttributeType.S)
                                .build(),
                        AttributeDefinition.builder()
                                .attributeName("email")
                                .attributeType(ScalarAttributeType.S)
                                .build()
                )
                .keySchema(
                        KeySchemaElement.builder()
                                .attributeName("user_id")
                                .keyType(KeyType.HASH)
                                .build()
                )
                .globalSecondaryIndexes(
                        GlobalSecondaryIndex.builder()
                                .indexName("email-index")
                                .keySchema(
                                        KeySchemaElement.builder()
                                                .attributeName("email")
                                                .keyType(KeyType.HASH)
                                                .build()
                                )
                                .projection(
                                        Projection.builder()
                                                .projectionType(ProjectionType.ALL)
                                                .build()
                                )
                                .build()
                )
                .billingMode(BillingMode.PAY_PER_REQUEST)
                .build();

        dynamoDbClient.createTable(request);

        dynamoDbClient.waiter().waitUntilTableExists(
                DescribeTableRequest.builder()
                        .tableName(tableName)
                        .build()
        );

        System.out.println("DynamoDB table created successfully: " + tableName);
    }
}