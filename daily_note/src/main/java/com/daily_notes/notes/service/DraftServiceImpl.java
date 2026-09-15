package com.daily_notes.notes.service;

import com.daily_notes.notes.dao.NoteDaoService;
import com.daily_notes.notes.records.ApiResponse;
import com.daily_notes.notes.records.CreateNoteDtoRecord;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class DraftServiceImpl implements DraftService {

    @Autowired
    private NoteDaoService noteDaoService;

    @Override
    public ApiResponse createNote(CreateNoteDtoRecord createNoteDtoRecord) {
        return null;
    }
}
