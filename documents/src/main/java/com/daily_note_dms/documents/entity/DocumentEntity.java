package com.daily_note_dms.documents.entity;

import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbAttribute;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbBean;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbPartitionKey;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbSortKey;

import java.time.LocalDate;

@DynamoDbBean
public class DocumentEntity {

    private String referenceId;
    private String id;
    private String referenceType;
    private String fileName;
    private String contentType;
    private Long fileSize;
    private String path;
    private LocalDate createdAt;
    private String userId;

    // =========================================================
    // PARTITION KEY
    // =========================================================

    @DynamoDbPartitionKey
    @DynamoDbAttribute("referenceId")
    public String getReferenceId() {
        return referenceId;
    }

    public void setReferenceId(String referenceId) {
        this.referenceId = referenceId;
    }

    // =========================================================
    // SORT KEY
    // =========================================================

    @DynamoDbSortKey
    @DynamoDbAttribute("id")
    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    // =========================================================
    // USER ID
    // =========================================================

    @DynamoDbAttribute("userId")
    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    // =========================================================
    // REFERENCE TYPE
    // =========================================================

    @DynamoDbAttribute("referenceType")
    public String getReferenceType() {
        return referenceType;
    }

    public void setReferenceType(String referenceType) {
        this.referenceType = referenceType;
    }

    // =========================================================
    // FILE NAME
    // =========================================================

    @DynamoDbAttribute("fileName")
    public String getFileName() {
        return fileName;
    }

    public void setFileName(String fileName) {
        this.fileName = fileName;
    }

    // =========================================================
    // CONTENT TYPE
    // =========================================================

    @DynamoDbAttribute("contentType")
    public String getContentType() {
        return contentType;
    }

    public void setContentType(String contentType) {
        this.contentType = contentType;
    }

    // =========================================================
    // FILE SIZE
    // =========================================================

    @DynamoDbAttribute("fileSize")
    public Long getFileSize() {
        return fileSize;
    }

    public void setFileSize(Long fileSize) {
        this.fileSize = fileSize;
    }

    // =========================================================
    // S3 PATH
    // =========================================================

    @DynamoDbAttribute("path")
    public String getPath() {
        return path;
    }

    public void setPath(String path) {
        this.path = path;
    }

    // =========================================================
    // CREATED AT
    // =========================================================

    @DynamoDbAttribute("createdAt")
    public LocalDate getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDate createdAt) {
        this.createdAt = createdAt;
    }
}