package com.daily_notes.notes.service;

import com.daily_notes.notes.dao.NoteDaoService;
import com.daily_notes.notes.dto.UpdateNoteDto;
import com.daily_notes.notes.entity.NoteEntity;
import com.daily_notes.notes.mapper.CustomMapper;
import com.daily_notes.notes.records.ApiResponse;
import com.daily_notes.notes.records.CreateNoteDtoRecord;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.NoSuchElementException;

import static com.daily_notes.notes.utility.constant.NoteConstant.SUCCESS;

@Service
public class NoteServiceImpl implements NoteService {

    private final NoteDaoService noteDaoService;

    public NoteServiceImpl(NoteDaoService noteDaoService) {
        this.noteDaoService = noteDaoService;
    }

    @Override
    public ApiResponse createNote(CreateNoteDtoRecord createNoteDto) {
        NoteEntity noteEntity = CustomMapper.mapToEntity(createNoteDto, NoteEntity.class);
        noteEntity = noteDaoService.createNote(noteEntity);
        return new ApiResponse(SUCCESS, true, noteEntity, new ArrayList<>());
    }

    @Override
    @Cacheable(value = "notes", key = "#noteId")
    public ApiResponse getNoteById(String noteId, String userId) {
        NoteEntity note = noteDaoService.getNoteById(noteId, userId);
        return new ApiResponse(SUCCESS, true, note, new ArrayList<>());
    }

    @Override
    public ApiResponse updateNote(UpdateNoteDto updateNoteDto) {
        NoteEntity note = noteDaoService.getNoteById(updateNoteDto.id(),
                updateNoteDto.userId());

        if (note == null)
            throw new NoSuchElementException("Note not found with id: " +
                    updateNoteDto.id() + " and userId: " + updateNoteDto.userId());

        note = noteDaoService.updateNote(note);
        return new ApiResponse(SUCCESS, true, Arrays.asList(note), new ArrayList<>());
    }

    @Override
    @CacheEvict
    public ApiResponse deleteNoteById(String id, String userId) {
        noteDaoService.deleteNote(id, userId);
        return new ApiResponse(SUCCESS, true, noteDaoService.getNoteById(id, userId), new ArrayList<>());
    }

    @Override
    public ApiResponse getAllNotes(String userId, Integer offset, Integer limit) {

        Pageable pageable = PageRequest.of(offset,
                limit, Sort.by(Sort.Direction.DESC, "created_at"));
        return new ApiResponse(SUCCESS, true, noteDaoService.getAllNotes(userId, pageable),
                new ArrayList<>());
    }
}
