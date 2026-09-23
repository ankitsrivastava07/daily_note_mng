package com.daily_note_dms.documents.dao;

import com.daily_note_dms.documents.entity.FileEntity;
import com.daily_note_dms.documents.repository.FileRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public class FileDaoImpl implements FileDao {

    private final FileRepository fileRepository;

    public FileDaoImpl(FileRepository fileRepository) {
        this.fileRepository = fileRepository;
    }

    @Override
    public FileEntity createFileQuotation(FileEntity fileEntity) {
        return fileRepository.save(fileEntity);
    }

    @Override
    public List<FileEntity> getAllFileByNoteId(String noteId) {
        return fileRepository.getFileByNoteId(noteId);
    }
}
