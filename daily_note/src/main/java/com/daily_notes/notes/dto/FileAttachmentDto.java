package com.daily_notes.notes.dto;

public record FileAttachmentDto(String id, String fileName, String contentType, short size, String desc) {
}
