package com.daily_note.search_text_app.service;

import co.elastic.clients.elasticsearch._types.query_dsl.TextQueryType;
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
                    .withQuery(q -> q.bool(b -> {

                        // Search only this user's records
                        b.filter(f -> f.term(t -> t
                                .field("userId")
                                .value(userId)
                        ));

                        // Prefix search: "Sta" finds "Stack"
                        b.should(s -> s.multiMatch(mm -> mm
                                .fields("name^3", "content")
                                .query(searchValue)
                                .type(TextQueryType.BoolPrefix)
                        ));

                        // Fuzzy search only for 4+ characters:
                        // "Stak" finds "Stack"
                        if (searchValue.length() >= 4) {
                            b.should(s -> s.multiMatch(mm -> mm
                                    .fields("name^3", "content")
                                    .query(searchValue)
                                    .fuzziness("AUTO")
                                    .prefixLength(2)
                                    .maxExpansions(20)
                            ));
                        }

                        return b.minimumShouldMatch("1");
                    }))
                    .withPageable(pageable)
                    .build();
        }

        SearchHits<TaskSearchDocument> searchHits =
                elasticsearchOperations.search(
                        query,
                        TaskSearchDocument.class
                );

        List<TaskSearchDocument> tasks = searchHits.getSearchHits()
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
