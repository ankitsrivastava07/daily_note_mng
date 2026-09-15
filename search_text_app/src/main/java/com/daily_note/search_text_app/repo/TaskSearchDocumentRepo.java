package com.daily_note.search_text_app.repo;

import com.daily_note.search_text_app.entity.TaskSearchDocument;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.elasticsearch.repository.ElasticsearchRepository;

public interface TaskSearchDocumentRepo extends ElasticsearchRepository<TaskSearchDocument, String> {
    Page<TaskSearchDocument> findByUserId(String userId, Pageable pageable);
}
