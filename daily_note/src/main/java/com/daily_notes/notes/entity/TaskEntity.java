
package com.daily_notes.notes.entity;

import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.*;

import java.time.Instant;

@DynamoDbBean
public class TaskEntity extends BaseEntity {

    private String name;
    private String taskTokenKey;
    private String content;
    private String priority;
    private String status;
    private String slugName;
    private String dueDate;
    private String dueTime;
    private String meridiem;

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    @DynamoDbSecondaryPartitionKey(indexNames = "taskTokenKey-index")
    public String getTaskTokenKey() {
        return taskTokenKey;
    }

    public void setTaskTokenKey(String taskTokenKey) {
        this.taskTokenKey = taskTokenKey;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public String getPriority() {
        return priority;
    }

    public void setPriority(String priority) {
        this.priority = priority;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getSlugName() {
        return slugName;
    }

    public void setSlugName(String slugName) {
        this.slugName = slugName;
    }

    public String getDueDate() {
        return dueDate;
    }

    public void setDueDate(String dueDate) {
        this.dueDate = dueDate;
    }

    public String getDueTime() {
        return dueTime;
    }

    public void setDueTime(String dueTime) {
        this.dueTime = dueTime;
    }

    public String getMeridiem() {
        return meridiem;
    }

    public void setMeridiem(String meridiem) {
        this.meridiem = meridiem;
    }

    @Override
    @DynamoDbPartitionKey
    @DynamoDbSecondaryPartitionKey(indexNames = "createdAt-index")
    public String getUserId() {
        return super.getUserId();
    }

    @Override
    @DynamoDbSortKey
    public String getId() {
        return super.getId();
    }

    @Override
    @DynamoDbSecondarySortKey(indexNames = "createdAt-index")
    public Instant getCreatedAt() {
        return super.getCreatedAt();
    }
}
