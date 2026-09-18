package com.daily_note.search_event_consumer.repository;

import com.daily_note.search_event_consumer.entity.TaskSearchDocument;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.elasticsearch.repository.ElasticsearchRepository;

public interface TaskSearchDocumentRepo extends ElasticsearchRepository<TaskSearchDocument, String> {
    Page<TaskSearchDocument> findByUserId(String userId, Pageable pageable);
}

