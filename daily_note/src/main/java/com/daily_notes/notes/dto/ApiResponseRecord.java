package com.daily_notes.notes.dto;

public record ApiResponseRecord(

        String message,
        Object data,
        Object error,
        Boolean flag
) {
}
