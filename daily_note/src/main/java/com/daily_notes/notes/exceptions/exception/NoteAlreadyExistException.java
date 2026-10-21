package com.daily_notes.notes.exceptions.exception;

public class NoteAlreadyExistException extends RuntimeException {

    public NoteAlreadyExistException(String message) {
        super(message);
    }
}
