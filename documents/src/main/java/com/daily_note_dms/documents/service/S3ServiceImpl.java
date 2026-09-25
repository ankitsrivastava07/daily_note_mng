package com.daily_note_dms.documents.service;

import com.daily_note_dms.documents.dto.ApiResponse;
import com.daily_note_dms.documents.dto.CreatePresignedUrlRequest;
import com.daily_note_dms.documents.utillity.DMSConstant;
import io.github.resilience4j.bulkhead.annotation.Bulkhead;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.PresignedPutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;

import java.time.Duration;

@Service
public class S3ServiceImpl implements S3Service {

    @Value("${aws.s3.bucket-name}")
    private String bucketName;

    @Autowired
    private S3Presigner s3Presigner;

    @Autowired
    private DMSConstant dmsConstant;

    @Override
    @Bulkhead(name = "GENERATE_PRESIGNED_URL",
            type = Bulkhead.Type.SEMAPHORE
            , fallbackMethod = "generateUploadUrlFallbackMethod")
    public String createPresignedURL(CreatePresignedUrlRequest createPresignedUrlRequest) {
        //String path = dmsConstant.getS3BucketFolder(createPresignedUrlRequest.contentType());
        String objectKey = createPresignedUrlRequest.referenceId() + "/" + System.currentTimeMillis() + "_" + createPresignedUrlRequest.fileName();

        // 2. Lock ContentType into the AWS S3 signature
        PutObjectRequest objectRequest = PutObjectRequest.builder()
                .bucket(bucketName)
                .key(objectKey)
                .contentType(createPresignedUrlRequest.contentType())
                .build();

        PutObjectPresignRequest presignRequest = PutObjectPresignRequest.builder()
                .signatureDuration(Duration.ofMinutes(5))
                .putObjectRequest(objectRequest)
                .build();

        PresignedPutObjectRequest presignedRequest = s3Presigner.presignPutObject(presignRequest);

        return presignedRequest.url().toString();
    }

    public ApiResponse generateUploadUrlFallback(CreatePresignedUrlRequest createPresignedUrlRequest) {
        return new ApiResponse().message("Presigned URL Generation Failed").status(Boolean.FALSE);
    }

}