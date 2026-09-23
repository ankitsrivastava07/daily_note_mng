package com.daily_note_dms.documents.utillity;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.Arrays;

@Component
public class DMSConstant {

    @Value("${aws.s3.daily_note/dms}")
    private String uploadPath;

    public String getS3BucketFolder(String contentType) {
        return Arrays.stream(uploadPath.split(","))
                .filter(e -> e.contains(contentType))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Invalid File Format "));
    }

    public static final String SUCCESS = "Success";

}
