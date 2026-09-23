package com.daily_note_dms.documents.repository;

import com.daily_note_dms.documents.entity.FileEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface FileRepository extends JpaRepository<FileEntity, Long> {

    List<FileEntity> getFileByNoteId(String noteId);
}
