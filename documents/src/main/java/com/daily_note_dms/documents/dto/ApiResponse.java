package com.daily_note_dms.documents.dto;

import java.util.ArrayList;

public record ApiResponse(
        String message,
        Boolean success,
        Object data,
        Object error
) {
    // Zero-argument constructor providing defaults
    public ApiResponse() {
        this(null, null, new ArrayList<>(), new ArrayList<>());
    }

    // Fluent "wither" methods returning a new copy with the updated field
    public ApiResponse message(String message) {
        return new ApiResponse(message, this.success, this.data, this.error);
    }

    public ApiResponse status(Boolean success) {
        return new ApiResponse(this.message, success, this.data, this.error);
    }

    public ApiResponse data(Object data) {
        return new ApiResponse(this.message, this.success, data, this.error);
    }

    public ApiResponse error(Object error) {
        return new ApiResponse(this.message, this.success, this.data, error);
    }
}