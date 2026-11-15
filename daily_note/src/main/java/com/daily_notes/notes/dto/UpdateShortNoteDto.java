package com.daily_notes.notes.dto;

import java.io.Serializable;

public record UpdateShortNoteDto(
        String id,
        String categoryId,
        String title,
        String content,
        String userId
) implements Serializable {
}