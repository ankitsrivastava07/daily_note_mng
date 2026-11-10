package com.daily_note_dms.documents.service;

import com.daily_note_dms.documents.dto.DmsFileResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.*;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

@Service
public class DmsFileService {

    private final S3Client s3Client;
    private final S3Presigner s3Presigner;

    @Value("${aws.s3.bucket-name:daily-note-dms}")
    private String bucketName;

    public DmsFileService(S3Client s3Client, S3Presigner s3Presigner) {
        this.s3Client = s3Client;
        this.s3Presigner = s3Presigner;
    }

    public List<DmsFileResponse> getAllFiles(String folderId) {

        String prefix = folderId + "/";

        List<DmsFileResponse> files = new ArrayList<>();

        ListObjectsV2Request request = ListObjectsV2Request.builder()
                .bucket(bucketName)
                .prefix(prefix)
                .build();

        // Automatically handles S3 pagination
        for (ListObjectsV2Response response :
                s3Client.listObjectsV2Paginator(request)) {

            for (S3Object object : response.contents()) {

                // Ignore folder placeholders
                if (object.key().endsWith("/")) {
                    continue;
                }

                String fileName = object.key()
                        .substring(prefix.length());

                GetObjectRequest getObjectRequest =
                        GetObjectRequest.builder()
                                .bucket(bucketName)
                                .key(object.key())
                                .build();

                GetObjectPresignRequest presignRequest =
                        GetObjectPresignRequest.builder()
                                .signatureDuration(Duration.ofMinutes(10))
                                .getObjectRequest(getObjectRequest)
                                .build();

                String downloadUrl = s3Presigner
                        .presignGetObject(presignRequest)
                        .url()
                        .toString();

                files.add(new DmsFileResponse(
                        fileName,
                        object.key(),
                        object.size(),
                        downloadUrl,
                        object.lastModified()
                ));
            }
        }

        return files;
    }
}
