package com.daily_notes.notes.service;

import com.daily_notes.notes.dto.CreateNoteDto;
import com.daily_notes.notes.dto.UpdateNoteDto;
import com.daily_notes.notes.records.ApiResponse;
import com.daily_notes.notes.records.CreateNoteDtoRecord;

import java.util.UUID;

public interface NoteService {

    ApiResponse createNote(CreateNoteDtoRecord createNoteDto);

    ApiResponse deleteNoteById(String id, String userId);

    ApiResponse getAllNotes(String userId, Integer page, Integer limit);

    ApiResponse updateNote(UpdateNoteDto updateNoteDto);
    ApiResponse getNoteById(String id, String userId);
}
