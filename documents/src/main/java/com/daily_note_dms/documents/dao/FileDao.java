package com.daily_note_dms.documents.dao;

import com.daily_note_dms.documents.entity.FileEntity;

import java.util.List;

public interface FileDao {
    FileEntity createFileQuotation(FileEntity fileEntity);

    List<FileEntity> getAllFileByNoteId(String noteId);
}
