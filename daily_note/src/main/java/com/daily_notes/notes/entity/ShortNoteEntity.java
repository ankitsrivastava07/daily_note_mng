
package com.daily_notes.notes.entity;

import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.*;

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
    @DynamoDbSecondarySortKey(
            indexNames = "UserUniqueTokenIndex"
    )
    public String getUniqueToken() {
        return uniqueToken;
    }

    public void setUniqueToken(String uniqueToken) {
        this.uniqueToken = uniqueToken;
    }

    // Table PK + GSI partition keys
    @Override
    @DynamoDbPartitionKey
    @DynamoDbSecondaryPartitionKey(
            indexNames = {
                    "shortnote_createdAt_index",
                    "UserUniqueTokenIndex",
                    "CategoryIndex"
            }
    )
    @DynamoDbAttribute("user_id")
    public String getUserId() {
        return super.getUserId();
    }

    // Table SK
    @Override
    @DynamoDbSortKey
    @DynamoDbAttribute("id")
    public String getId() {
        return super.getId();
    }

    // GSI sort key for latest notes
    @Override
    @DynamoDbSecondarySortKey(
            indexNames = "shortnote_createdAt_index"
    )
    @DynamoDbAttribute("createdAt")
    public Instant getCreatedAt() {
        return super.getCreatedAt();
    }

    @DynamoDbAttribute("categoryId")
    @DynamoDbSecondarySortKey(
            indexNames = "CategoryIndex"
    )
    public String getCategoryId() {
        return categoryId;
    }

    public void setCategoryId(String categoryId) {
        this.categoryId = categoryId;
    }
}
