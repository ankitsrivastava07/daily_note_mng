
package com.daily_notes.notes.entity;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbBean;
import java.time.Instant;

@DynamoDbBean
public class TodayTaskEntity extends BaseEntity {

    private String name;
    private String content;
    private String priority;
    private String status;
    private Instant dueTime;
    private String createdBy;

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

    public Instant getDueTime() {
        return dueTime;
    }

    public void setDueTime(Instant dueTime) {
        this.dueTime = dueTime;
    }

    public String getCreatedBy() {
        return createdBy;
    }

    public void setCreatedBy(String createdBy) {
        this.createdBy = createdBy;
    }
}
