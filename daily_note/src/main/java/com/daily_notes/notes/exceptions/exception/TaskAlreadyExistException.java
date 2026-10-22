package com.daily_notes.notes.exceptions.exception;

public class TaskAlreadyExistException extends RuntimeException {

    public TaskAlreadyExistException(String message) {
        super(message);
    }
}
