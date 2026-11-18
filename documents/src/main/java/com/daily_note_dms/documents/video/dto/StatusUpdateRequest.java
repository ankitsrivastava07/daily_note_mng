package com.daily_note_dms.documents.video.dto;

public class StatusUpdateRequest {
    private String status; // Jaise "READY" ya "FAILED"
    private Long fileSizeBytes; // Optional: agar file size bhi bhejni ho
    private Integer durationSeconds; // Optional: video length

    // Getters and Setters
    public String getStatus() {
        return status;
    }
    public void setStatus(String status) {
        this.status = status;
    }

    public Long getFileSizeBytes() {
        return fileSizeBytes;
    }
    public void setFileSizeBytes(Long fileSizeBytes) {
        this.fileSizeBytes = fileSizeBytes;
    }

    public Integer getDurationSeconds() {
        return durationSeconds;
    }
    public void setDurationSeconds(Integer durationSeconds) {
        this.durationSeconds = durationSeconds;
    }
}