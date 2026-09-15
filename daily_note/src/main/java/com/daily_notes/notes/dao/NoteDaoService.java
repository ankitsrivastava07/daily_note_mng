package com.daily_notes.notes.dao;

import com.daily_notes.notes.entity.NoteEntity;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface NoteDaoService {

    NoteEntity createNote(NoteEntity noteEntity);

    void deleteNote(String noteId, String userId);

    NoteEntity updateNote(NoteEntity noteEntity);

    List<NoteEntity> getAllNotes(String userId, Pageable pageable);

    NoteEntity getNoteById(String noteId, String userId);
}
