package com.daily_notes.notes.dao;

import com.daily_notes.notes.entity.NoteEntity;
import java.util.List;

public interface NoteDaoService {

    NoteEntity createNote(NoteEntity noteEntity);

    void deleteNote(String noteId, String userId);

    NoteEntity updateNote(NoteEntity noteEntity);

    List<NoteEntity> getAllNotes(String userId);

    NoteEntity getNoteById(String noteId, String userId);

    NoteEntity findByNoteKeyToken(String userId, String token);

}
