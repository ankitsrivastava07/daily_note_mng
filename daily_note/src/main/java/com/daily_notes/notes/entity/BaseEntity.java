
package com.daily_notes.notes.entity;

import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.*;

import java.time.Instant;

@DynamoDbBean
public abstract class BaseEntity {

    private String userId;
    private String id;
    private Instant createdAt;
    private Instant updateAt;

    // Table partition key + GSI partition key
    @DynamoDbPartitionKey
    @DynamoDbSecondaryPartitionKey(
            indexNames = "shortnote_createdAt_index"
    )
    @DynamoDbAttribute("user_id")
    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    // Existing table sort key
    @DynamoDbSortKey
    @DynamoDbAttribute("id")
    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    // GSI sort key
    @DynamoDbSecondarySortKey(
            indexNames = "shortnote_createdAt_index"
    )
    @DynamoDbAttribute("createdAt")
    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    @DynamoDbAttribute("updateAt")
    public Instant getUpdateAt() {
        return updateAt;
    }

    public void setUpdateAt(Instant updateAt) {
        this.updateAt = updateAt;
    }
}
