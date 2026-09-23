package com.daily_note_dms.documents.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.springframework.data.redis.core.index.Indexed;

@Getter
@Setter
@Entity
@Table(name = "file")
public class FileEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String fileName;
    private String contentType;
    private Short fileSize;
    private String path;
    @Column(nullable = false)
    @Indexed
    private String noteId;
}
