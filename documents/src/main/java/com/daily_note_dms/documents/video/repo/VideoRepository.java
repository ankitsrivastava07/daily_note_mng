package com.daily_note_dms.documents.repository;

import com.daily_note_dms.documents.video.entity.VideoRecording;
import org.springframework.stereotype.Repository;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbEnhancedClient;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbTable;
import software.amazon.awssdk.enhanced.dynamodb.TableSchema;
import software.amazon.awssdk.enhanced.dynamodb.model.QueryConditional;
import software.amazon.awssdk.enhanced.dynamodb.model.QueryEnhancedRequest;

import java.util.List;
import java.util.stream.Collectors;

@Repository
public class VideoRepository {

    private final DynamoDbTable<VideoRecording> videoTable;

    public VideoRepository(DynamoDbEnhancedClient enhancedClient) {
        this.videoTable = enhancedClient.table("video_recordings", TableSchema.fromBean(VideoRecording.class));
    }

    public void save(VideoRecording record) {
        videoTable.putItem(record);
    }

    public VideoRecording findById(String videoId) {
        return videoTable.getItem(r -> r.key(k -> k.partitionValue(videoId)));
    }

    public void update(VideoRecording record) {
        videoTable.updateItem(record);
    }

    public List<VideoRecording> findByReferenceIdAndStatus(String referenceId, String status) {
        QueryConditional queryConditional = QueryConditional.keyEqualTo(k -> k.partitionValue(referenceId));

        QueryEnhancedRequest queryRequest = QueryEnhancedRequest.builder()
                .queryConditional(queryConditional)
                .build();

        return videoTable.index("ReferenceIndex")
                .query(queryRequest)
                .stream()
                .flatMap(page -> page.items().stream())
                .filter(record -> status.equals(record.getStatus()))
                .collect(Collectors.toList());
    }
}