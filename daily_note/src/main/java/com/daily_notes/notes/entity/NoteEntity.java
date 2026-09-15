package com.daily_notes.notes.entity;

import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbAttribute;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbBean;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbPartitionKey;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@DynamoDbBean
public class NoteEntity extends BaseEntity {

    private String userId;
    private String noteKey;

    private Instant createAt;
    private String id;
    private String title;
    private String content;
    private List<String> attachments = new ArrayList<>();
    private Instant updatedAt;
    private String createdBy;
    private String updatedBy;
    private List<String> todoIds = new ArrayList<>();
    private String priority;
    private String statusId;
    private String projectIdBandId;
    private String visibilityId;
    private String assigneeOwnerId;
    private String location;
    private String version;
    private String dueDateTime;
    private String estTime;
    private String remainderAlterId;
    private String repeatNoteAutomaticallyId;

    @Override
    public void setUserId(String userId) {
        this.userId = userId;
    }

    public String getNoteKey() {
        return noteKey;
    }

    public void setNoteKey(String noteKey) {
        this.noteKey = noteKey;
    }

    public Instant getCreateAt() {
        return createAt;
    }

    public void setCreateAt(Instant createAt) {
        this.createAt = createAt;
    }

    @Override
    public String getId() {
        return id;
    }

    @Override
    public void setId(String id) {
        this.id = id;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public List<String> getAttachments() {
        return attachments;
    }

    public void setAttachments(List<String> attachments) {
        this.attachments = attachments;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }

    public String getCreatedBy() {
        return createdBy;
    }

    public void setCreatedBy(String createdBy) {
        this.createdBy = createdBy;
    }

    public String getUpdatedBy() {
        return updatedBy;
    }

    public void setUpdatedBy(String updatedBy) {
        this.updatedBy = updatedBy;
    }

    public List<String> getTodoIds() {
        return todoIds;
    }

    public void setTodoIds(List<String> todoIds) {
        this.todoIds = todoIds;
    }

    public String getPriority() {
        return priority;
    }

    public void setPriority(String priority) {
        this.priority = priority;
    }

    public String getStatusId() {
        return statusId;
    }

    public void setStatusId(String statusId) {
        this.statusId = statusId;
    }

    public String getProjectIdBandId() {
        return projectIdBandId;
    }

    public void setProjectIdBandId(String projectIdBandId) {
        this.projectIdBandId = projectIdBandId;
    }

    public String getVisibilityId() {
        return visibilityId;
    }

    public void setVisibilityId(String visibilityId) {
        this.visibilityId = visibilityId;
    }

    public String getAssigneeOwnerId() {
        return assigneeOwnerId;
    }

    public void setAssigneeOwnerId(String assigneeOwnerId) {
        this.assigneeOwnerId = assigneeOwnerId;
    }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public String getVersion() {
        return version;
    }

    public void setVersion(String version) {
        this.version = version;
    }

    public String getDueDateTime() {
        return dueDateTime;
    }

    public void setDueDateTime(String dueDateTime) {
        this.dueDateTime = dueDateTime;
    }

    public String getEstTime() {
        return estTime;
    }

    public void setEstTime(String estTime) {
        this.estTime = estTime;
    }

    public String getRemainderAlterId() {
        return remainderAlterId;
    }

    public void setRemainderAlterId(String remainderAlterId) {
        this.remainderAlterId = remainderAlterId;
    }

    public String getRepeatNoteAutomaticallyId() {
        return repeatNoteAutomaticallyId;
    }

    public void setRepeatNoteAutomaticallyId(String repeatNoteAutomaticallyId) {
        this.repeatNoteAutomaticallyId = repeatNoteAutomaticallyId;
    }

    public String getCategoryId() {
        return categoryId;
    }

    public void setCategoryId(String categoryId) {
        this.categoryId = categoryId;
    }

    public String getKeyTakeAwaysHighLights() {
        return keyTakeAwaysHighLights;
    }

    public void setKeyTakeAwaysHighLights(String keyTakeAwaysHighLights) {
        this.keyTakeAwaysHighLights = keyTakeAwaysHighLights;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public List<String> getCheckList() {
        return checkList;
    }

    public void setCheckList(List<String> checkList) {
        this.checkList = checkList;
    }

    public List<String> getTags() {
        return tags;
    }

    public void setTags(List<String> tags) {
        this.tags = tags;
    }

    public String getReferenceURL() {
        return referenceURL;
    }

    public void setReferenceURL(String referenceURL) {
        this.referenceURL = referenceURL;
    }

    public String getSubCategoryId() {
        return subCategoryId;
    }

    public void setSubCategoryId(String subCategoryId) {
        this.subCategoryId = subCategoryId;
    }

    private String categoryId;
    private String keyTakeAwaysHighLights;
    private String description;
    private List<String> checkList = new ArrayList<>();
    private List<String> tags = new ArrayList<>();
    private String referenceURL;
    private String subCategoryId;

    @DynamoDbAttribute("user_id")
    @DynamoDbPartitionKey
    public String getUserId(){
        return userId;
    }
}