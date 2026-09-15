package com.daily_notes.notes.service;

import com.daily_notes.notes.records.ApiResponse;
import com.daily_notes.notes.records.CreateNoteDtoRecord;

public interface DraftService {

    ApiResponse createNote(CreateNoteDtoRecord createNoteDtoRecord);
}