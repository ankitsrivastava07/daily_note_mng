
package com.daily_note_dms.documents.dto;

import java.util.ArrayList;

public record ApiResponse(
        String message,
        Boolean success,
        Object data,
        Object error
) {

    public ApiResponse() {
        this(null, null, new ArrayList<>(), new ArrayList<>());
    }

    // Fluent methods

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
