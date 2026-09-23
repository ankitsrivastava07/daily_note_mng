package com.daily_note_dms.documents.service;

import com.daily_note_dms.documents.dao.FileDao;
import com.daily_note_dms.documents.dto.ApiResponse;
import com.daily_note_dms.documents.dto.CreatePresignedUrlRequest;
import com.daily_note_dms.documents.dto.DocumentDto;
import com.daily_note_dms.documents.entity.FileEntity;
import com.daily_note_dms.documents.utillity.DMSConstant;
import io.github.resilience4j.bulkhead.BulkheadFullException;
import io.github.resilience4j.bulkhead.annotation.Bulkhead;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class FileServiceImpl implements FileService {
    private FileDao fileDao;
    private S3Service s3Service;
    private Logger logger = LoggerFactory.getLogger(this.getClass());

    public FileServiceImpl(FileDao fileDao, S3Service s3Service) {
        this.fileDao = fileDao;
        this.s3Service = s3Service;
    }

    @Override
    @Bulkhead(
            name = "DMS_S3_URL_PRESIGNED_GENERATE",
            type = Bulkhead.Type.SEMAPHORE,
            fallbackMethod = "createFileUploadPresignedURLFallback"
    )
    public ApiResponse createFileUploadPresignedURL(String noteId, DocumentDto documentDto) {
        FileEntity fileEntity = new FileEntity();
        fileEntity.setNoteId(noteId);
        fileEntity = fileDao.createFileQuotation(fileEntity);
        return s3Service.generateUploadUrl(new CreatePresignedUrlRequest(documentDto.getFileName(),
                documentDto.getContentType(), documentDto.getFileSize(), noteId));
    }

    public ApiResponse createFileUploadPresignedURLFallback(String noteId, BulkheadFullException exp) {
        logger.info("createFileUploadPresignedURLFallback has called {}", exp.getLocalizedMessage());
        return new ApiResponse().status(Boolean.FALSE).message("Something Went Wrong");
    }

    @Override
    public ApiResponse getAllDocumentByNoteId(String noteId) {
        return new ApiResponse().data(fileDao.getAllFileByNoteId(noteId))
                .message(DMSConstant.SUCCESS)
                .status(Boolean.TRUE);
    }

}
