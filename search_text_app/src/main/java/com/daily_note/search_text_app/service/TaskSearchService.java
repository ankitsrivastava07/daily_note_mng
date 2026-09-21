package com.daily_note.search_text_app.service;

import com.daily_note.search_text_app.entity.TaskSearchDocument;
import org.springframework.data.domain.*;
import org.springframework.data.elasticsearch.client.elc.NativeQuery;
import org.springframework.data.elasticsearch.core.ElasticsearchOperations;
import org.springframework.data.elasticsearch.core.SearchHit;
import org.springframework.data.elasticsearch.core.SearchHits;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class TaskSearchService {

    private final ElasticsearchOperations elasticsearchOperations;

    public TaskSearchService(ElasticsearchOperations elasticsearchOperations) {
        this.elasticsearchOperations = elasticsearchOperations;
    }

    public Page<TaskSearchDocument> getAllTasks(
            String userId,
            int page,
            int size,
            String search) {

        Pageable pageable = PageRequest.of(
                page,
                size,
                Sort.by(
                        Sort.Direction.DESC,
                        "createdAt"
                )
        );

        NativeQuery query;

        if (search == null || search.isBlank()) {

            query = NativeQuery.builder()
                    .withQuery(q -> q
                            .term(t -> t
                                    .field("userId")
                                    .value(userId)
                            )
                    )
                    .withPageable(pageable)
                    .build();

        }
     package com.daily_note.search_text_app.service;

import com.daily_note.search_text_app.entity.TaskSearchDocument;
import org.springframework.data.domain.*;
import org.springframework.data.elasticsearch.client.elc.NativeQuery;
import org.springframework.data.elasticsearch.core.ElasticsearchOperations;
import org.springframework.data.elasticsearch.core.SearchHit;
import org.springframework.data.elasticsearch.core.SearchHits;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class TaskSearchService {

    private final ElasticsearchOperations elasticsearchOperations;

    public TaskSearchService(ElasticsearchOperations elasticsearchOperations) {
        this.elasticsearchOperations = elasticsearchOperations;
    }

    public Page<TaskSearchDocument> getAllTasks(
            String userId,
            int page,
            int size,
            String search) {

        Pageable pageable = PageRequest.of(
                page,
                size,
                Sort.by(
                        Sort.Direction.DESC,
                        "createdAt"
                )
        );

        NativeQuery query;

        if (search == null || search.isBlank()) {

            query = NativeQuery.builder()
                    .withQuery(q -> q
                            .term(t -> t
                                    .field("userId")
                                    .value(userId)
                            )
                    )
                    .withPageable(pageable)
                    .build();

        } else {

            String searchValue = search.trim();

            query = NativeQuery.builder()
                    .withQuery(q -> q
                            .bool(b -> b
                                    .filter(f -> f
                                            .term(t -> t
                                                    .field("userId")
                                                    .value(userId)
                                            )
                                    )
                                    .must(m -> m
                                            .multiMatch(mm -> mm
                                                    .fields(
                                                            "name",
                                                            "content"
                                                    )
                                                    .query(searchValue)
                                            )
                                    )
                            )
                    )
                    .withPageable(pageable)
                    .build();
        }

        SearchHits<TaskSearchDocument> searchHits =
                elasticsearchOperations.search(
                        query,
                        TaskSearchDocument.class
                );

        List<TaskSearchDocument> tasks =
                searchHits.getSearchHits()
                        .stream()
                        .map(SearchHit::getContent)
                        .toList();

        return new PageImpl<>(
                tasks,
                pageable,
                searchHits.getTotalHits()
        );
    }

}   

    

}
