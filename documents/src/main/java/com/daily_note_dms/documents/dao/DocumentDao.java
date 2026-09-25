package com.daily_note_dms.documents.dao;

import com.daily_note_dms.documents.entity.DocumentEntity;

import java.util.List;

public interface DocumentDao {
    //DocumentEntity saveDocument(DocumentEntity fileEntity);
    void saveDocument(List<DocumentEntity> fileEntity);

    List<DocumentEntity> getDocumentByReferenceId(String noteId);
}
