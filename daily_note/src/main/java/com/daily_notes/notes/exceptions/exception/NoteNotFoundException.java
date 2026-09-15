package com.daily_notes.notes.exceptions.exception;

public class NoteNotFoundException extends RuntimeException {

    public NoteNotFoundException(String msg) {
        super(msg);
    }
}
