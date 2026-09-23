package com.daily_note_dms.documents.dto;

import lombok.Getter;
import lombok.Setter;
import org.springframework.stereotype.Component;

@Getter
@Setter
@Component
public class DocumentDto {

    private String fileName;
    private String contentType;
    private Long fileSize;
    byte[] content;
}
