package com.daily_note.search_text_app.dto;

import java.time.Instant;
import java.time.LocalDate;

public class TaskEvent {

    private String eventId;
    private String eventType;
    private String taskId;
    private LocalDate dueDate;
    private String dueTime;

    public LocalDate getDueDate() {
        return dueDate;
    }

    public void setDueDate(LocalDate dueDate) {
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

    private String meridiem;

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getUpdateAt() {
        return updateAt;
    }

    public void setUpdateAt(Instant updateAt) {
        this.updateAt = updateAt;
    }

    private String userId;
    private String name;
    private String content;
    private String priority;
    private String status;
    private Long version;
    private Instant createdAt;
    private Instant updateAt;


    @Override
    public String toString() {
        return "TaskEvent{" +
                "eventId='" + eventId + '\'' +
                ", eventType='" + eventType + '\'' +
                ", taskId='" + taskId + '\'' +
                ", userId='" + userId + '\'' +
                ", name='" + name + '\'' +
                ", content='" + content + '\'' +
                ", priority='" + priority + '\'' +
                ", status='" + status + '\'' +
                ", version=" + version +
                '}';
    }

    public TaskEvent() {
    }

    public String getEventId() {
        return eventId;
    }

    public void setEventId(String eventId) {
        this.eventId = eventId;
    }

    public String getEventType() {
        return eventType;
    }

    public void setEventType(String eventType) {
        this.eventType = eventType;
    }

    public String getTaskId() {
        return taskId;
    }

    public void setTaskId(String taskId) {
        this.taskId = taskId;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

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

    public Long getVersion() {
        return version;
    }

    public void setVersion(Long version) {
        this.version = version;
    }
}