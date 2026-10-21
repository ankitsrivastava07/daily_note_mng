package com.daily_notes.notes.service;

import com.daily_notes.notes.dto.UpdateNoteDto;
import com.daily_notes.notes.records.ApiResponse;
import com.daily_notes.notes.records.CreateNoteDtoRecord;

public interface NoteService {

    ApiResponse createNote(CreateNoteDtoRecord createNoteDto) throws Exception;

    ApiResponse deleteNoteById(String id, String userId);

    ApiResponse getAllNotes(String userId, Integer page, Integer limit);

    ApiResponse updateNote(UpdateNoteDto updateNoteDto);

    ApiResponse getNoteById(String id, String userId);

}
