package com.daily_notes.notes.dto;

import java.time.Instant;
import java.util.List;

public class ShortNoteDto {

    private String name;
    private String path;

    public String getPath() {
        return path;
    }

    public void setPath(String path) {
        this.path = path;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    private Instant createdAt;

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public List<String> getDownloadUrl() {
        return downloadUrl;
    }

    public void setDownloadUrl(List<String> downloadUrl) {
        this.downloadUrl = downloadUrl;
    }

    private String content;
    private String title;

    private List<String> downloadUrl;
}
