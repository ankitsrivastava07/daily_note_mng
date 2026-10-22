package com.daily_notes.notes.service;

import com.daily_notes.notes.dao.NoteDaoService;
import com.daily_notes.notes.dto.UpdateNoteDto;
import com.daily_notes.notes.entity.NoteEntity;
import com.daily_notes.notes.exceptions.exception.NoteAlreadyExistException;
import com.daily_notes.notes.mapper.CustomMapper;
import com.daily_notes.notes.records.ApiResponse;
import com.daily_notes.notes.records.CreateNoteDtoRecord;
import com.daily_notes.notes.utility.constant.TokenUtil;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.NoSuchElementException;
import java.util.regex.Pattern;

import static com.daily_notes.notes.utility.constant.NoteConstant.SUCCESS;

@Service
public class NoteServiceImpl implements NoteService {

    private static final Pattern WHITESPACE_PATTERN = Pattern.compile("\\s+");

    private final NoteDaoService noteDaoService;
    private final Logger logger = LoggerFactory.getLogger(NoteServiceImpl.class);

    public NoteServiceImpl(NoteDaoService noteDaoService) {
        this.noteDaoService = noteDaoService;
    }

    @Override
    public ApiResponse createNote(CreateNoteDtoRecord createNoteDto) throws Exception {
        String userId = createNoteDto.userId();
        String title = createNoteDto.title();

        logger.info("Creating note for userId: {} with title: {}", userId, title);

        if (title.isBlank()) {
            throw new IllegalArgumentException("Note title cannot be blank.");
        }

        String token = TokenUtil.generateToken(userId, title);
        if (noteDaoService.findByNoteKeyToken(userId, token) != null) {
            logger.info("Note with title: {} already exists for userId: {}", title, userId);
            throw new NoteAlreadyExistException("You already have a note with this title" +
                    " in your account. Please choose a different title.");
        }

        NoteEntity noteEntity = CustomMapper.mapToEntity(createNoteDto, NoteEntity.class);
        noteEntity.setTitle(title);
        noteEntity.setNoteKey(token);

        logger.info("Note with title: {} does not exist for userId: {}", title, userId);
        noteEntity = noteDaoService.createNote(noteEntity);
        return new ApiResponse(SUCCESS, true, noteEntity, new ArrayList<>());
    }

    @Override
    @Cacheable(value = "notes", key = "#noteId")
    public ApiResponse getNoteById(String noteId, String userId) {
        logger.info("Fetching note with id: {} for userId: {}", noteId, userId);
        NoteEntity note = noteDaoService.getNoteById(noteId, userId);
        return new ApiResponse(SUCCESS, true, note, new ArrayList<>());
    }

    @Override
    public ApiResponse updateNote(UpdateNoteDto updateNoteDto) {
        logger.info("Updating note with id: {} for userId: {}", updateNoteDto.id(), updateNoteDto.userId());
        NoteEntity note = noteDaoService.getNoteById(updateNoteDto.id(),
                updateNoteDto.userId());

        if (note == null) {
            logger.info("Note not found with id: {} and userId: {}", updateNoteDto.id(), updateNoteDto.userId());
            throw new NoSuchElementException("Note not found with id: " +
                    updateNoteDto.id() + " and userId: " + updateNoteDto.userId());
        }
        note = noteDaoService.updateNote(note);
        return new ApiResponse(SUCCESS, true, Arrays.asList(note), new ArrayList<>());
    }

    @Override
    @CacheEvict
    public ApiResponse deleteNoteById(String id, String userId) {
        logger.info("Deleting note with id: {} for userId: {}", id, userId);
        noteDaoService.deleteNote(id, userId);
        return new ApiResponse(SUCCESS, true, noteDaoService.getNoteById(id, userId), new ArrayList<>());
    }

    @Override
    public ApiResponse getAllNotes(String userId, Integer offset, Integer limit) {
        logger.info("Fetching notes for userId: {}, offset: {}, limit: {}", userId, offset, limit);
        Pageable pageable = PageRequest.of(offset,
                limit, Sort.by(Sort.Direction.DESC, "created_at"));
        return new ApiResponse(SUCCESS, true,
                noteDaoService.getAllNotes(userId, pageable),
                new ArrayList<>());
    }

}
