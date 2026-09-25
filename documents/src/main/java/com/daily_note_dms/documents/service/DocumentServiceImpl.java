package com.daily_note_dms.documents.service;

import com.daily_note_dms.documents.dao.DocumentDao;
import com.daily_note_dms.documents.dto.ApiResponse;
import com.daily_note_dms.documents.dto.CreatePresignedUrlRequest;
import com.daily_note_dms.documents.dto.DocumentDto;
import com.daily_note_dms.documents.entity.DocumentEntity;
import io.github.resilience4j.bulkhead.BulkheadFullException;
import io.github.resilience4j.bulkhead.annotation.Bulkhead;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.Date;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Collectors;

import static com.daily_note_dms.documents.utillity.DMSConstant.SUCCESS;

@Service
public class DocumentServiceImpl implements DocumentService {
    private final DocumentDao documentDao;
    private final S3Service s3Service;
    private final Logger logger = LoggerFactory.getLogger(this.getClass());

    public DocumentServiceImpl(DocumentDao fileDao, S3Service s3Service) {
        this.documentDao = fileDao;
        this.s3Service = s3Service;
    }

    @Override
    @Bulkhead(
            name = "DMS_S3_URL_PRESIGNED_GENERATE",
            type = Bulkhead.Type.SEMAPHORE,
            fallbackMethod = "createDocumentUploadPresignedURLFallback"
    )
    public ApiResponse saveDocument(String referenceId,
                                    List<DocumentDto> documentDtos) {
        logger.info(" Save Documents are {}", documentDtos);
        List<DocumentEntity> list = documentDtos.stream().map(e -> {
            DocumentEntity fileEntity = new DocumentEntity();
            fileEntity.setReferenceId(referenceId);
            fileEntity.setFileName(e.getFileName());
            fileEntity.setFileSize(e.getFileSize());
            fileEntity.setContentType(e.getContentType());
            fileEntity.setCreatedAt(LocalDate.now());
            fileEntity.setUserId(e.getUserId());
            fileEntity.setId(String.valueOf(System.nanoTime()+1));
            return fileEntity;
        }).collect(Collectors.toList());

        documentDao.saveDocument(list);
        return new ApiResponse()
                .message(SUCCESS)
                .status(Boolean.TRUE);
    }

    public ApiResponse createDocumentUploadPresignedURLFallback(String noteId, BulkheadFullException exp) {
        logger.info("createFileUploadPresignedURLFallback has called {}", exp.getLocalizedMessage());
        return new ApiResponse().status(Boolean.FALSE).message("Something Went Wrong");
    }

    @Override
    public ApiResponse getAllDocumentByNoteId(String referenceId) {
        return new ApiResponse().data(documentDao.getDocumentByReferenceId(referenceId))
                .message(SUCCESS)
                .status(Boolean.TRUE);
    }

    @Override
    public ApiResponse getPresignedURL(String referenceId, List<String> fileName) {

        if (fileName.size() > 5)
            throw new IllegalArgumentException("Maximum 5 files are allowed.");

        if (fileName.isEmpty()) {
            return new ApiResponse()
                    .status(Boolean.TRUE)
                    .message(SUCCESS);
        }


        List<String> presignedURL = fileName
                .stream()
                .map(e -> s3Service
                        .createPresignedURL(new CreatePresignedUrlRequest(e,
                                null, null, referenceId)))
                .collect(Collectors.toList());

        return new ApiResponse()
                .data(presignedURL)
                .status(Boolean.TRUE)
                .message(SUCCESS);
    }

}
