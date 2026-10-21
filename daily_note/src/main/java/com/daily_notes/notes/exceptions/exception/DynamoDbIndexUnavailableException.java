package com.daily_notes.notes.exceptions.exception;

public class DynamoDbIndexUnavailableException extends RuntimeException {

    public DynamoDbIndexUnavailableException(String message) {
        super(message);
    }
}
