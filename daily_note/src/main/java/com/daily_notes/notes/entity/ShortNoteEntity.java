
package com.daily_notes.notes.entity;

import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbAttribute;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbBean;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbPartitionKey;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbSecondaryPartitionKey;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbSecondarySortKey;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbSortKey;

import java.time.Instant;

@DynamoDbBean
public class ShortNoteEntity extends BaseEntity {

    private String name;
    private String content;
    private String uniqueToken;
    private String title;
    private String categoryId;

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    @DynamoDbAttribute("unique_token")
    @DynamoDbSecondarySortKey(indexNames = "UserUniqueTokenIndex")
    public String getUniqueToken() {
        return uniqueToken;
    }

    public void setUniqueToken(String uniqueToken) {
        this.uniqueToken = uniqueToken;
    }

    @Override
    @DynamoDbPartitionKey
    @DynamoDbSecondaryPartitionKey(
            indexNames = {
                    "LatestNotesIndex",
                    "UserUniqueTokenIndex"
            }
    )
    @DynamoDbAttribute("user_id")
    public String getUserId() {
        return super.getUserId();
    }

    @Override
    @DynamoDbSortKey
    public String getId() {
        return super.getId();
    }

    @Override
    @DynamoDbSecondarySortKey(indexNames = "LatestNotesIndex")
    @DynamoDbAttribute("createdAt")
    public Instant getCreatedAt() {
        return super.getCreatedAt();
    }

    @DynamoDbAttribute("categoryId")
    public String getCategoryId() {
        return categoryId;
    }

    public void setCategoryId(String categoryId) {
        this.categoryId = categoryId;
    }
}
