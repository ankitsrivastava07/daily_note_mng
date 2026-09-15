package com.daily_notes.notes.entity;

import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.*;

import java.time.Instant;

@DynamoDbBean
public class ShortNoteEntity extends BaseEntity {

    private String name;
    private String content;

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

    public void setCategoryId(String categoryId) {
        this.categoryId = categoryId;
    }

    private String title;
    private String categoryId;

    @Override
    @DynamoDbPartitionKey
    @DynamoDbSecondaryPartitionKey(indexNames = "LatestNotesIndex")
    @DynamoDbAttribute("user_id")
    public String getUserId() {
        return super.getUserId();
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
}