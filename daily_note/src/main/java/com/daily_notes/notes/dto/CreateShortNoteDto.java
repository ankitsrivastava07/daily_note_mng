package com.daily_notes.notes.dto;

import java.io.Serializable;

public record
CreateShortNoteDto(String categoryId, String title, String content,
                                 String userId) implements Serializable {

    public CreateShortNoteDto(String categoryId, String userId) {
        this(categoryId, "", "", userId);
    }
}

