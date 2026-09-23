package com.daily_note_dms.documents.config;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.BucketVersioningStatus;
import software.amazon.awssdk.services.s3.model.PutBucketVersioningRequest;
import software.amazon.awssdk.services.s3.model.VersioningConfiguration;

@Configuration
public class AWSS3BucketVersionConfig {

    @Value("${aws.s3.bucket-name}")
    private String bucketName;

    private final S3Client s3Client;

    public AWSS3BucketVersionConfig(S3Client s3Client) {
        this.s3Client = s3Client;
    }

    @PostConstruct
    public void init() {
        VersioningConfiguration versioningConfiguration = VersioningConfiguration
                .builder()
                .status(BucketVersioningStatus.ENABLED)
                .build();

        PutBucketVersioningRequest request = PutBucketVersioningRequest
                .builder()
                .versioningConfiguration(versioningConfiguration)
                .bucket(bucketName)
                .build();
        s3Client.putBucketVersioning(request);
    }

}
