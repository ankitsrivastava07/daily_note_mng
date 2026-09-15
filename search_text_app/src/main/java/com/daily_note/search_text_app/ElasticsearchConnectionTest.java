/*
package com.daily_note.search_text_app;

import com.daily_note.search_text_app.entity.TaskSearchDocument;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.elasticsearch.core.ElasticsearchOperations;
import org.springframework.stereotype.Component;

@Component
public class ElasticsearchConnectionTest {

    @Autowired
    private ElasticsearchOperations elasticsearchOperations;

    @PostConstruct
    public void testConnection() {
        boolean exists =
                elasticsearchOperations.indexOps(TaskSearchDocument.class).exists();

        System.out.println("Elasticsearch connected. Index exists = " + exists);
    }
}*/
