package com.daily_note_dms.documents.video.repo;

import com.daily_note_dms.documents.video.entity.VideoRecording;
import org.springframework.stereotype.Repository;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbEnhancedClient;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbTable;
import software.amazon.awssdk.enhanced.dynamodb.Key;
import software.amazon.awssdk.enhanced.dynamodb.TableSchema;
import software.amazon.awssdk.enhanced.dynamodb.model.QueryConditional;
import software.amazon.awssdk.enhanced.dynamodb.model.QueryEnhancedRequest;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
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

    public VideoRecording findById(String id, String userId) {
        Key key = Key.builder()
                .partitionValue(userId) // 👈 Partition key pehle (user_id)
                .sortValue(id)          // 👈 Sort key baad mein (id)
                .build();

        return videoTable.getItem(r -> r.key(key));
    }

    public VideoRecording findById(String id) {
        Key key = Key.builder()
                .partitionValue(id) // 👈 Partition key pehle (user_id)
                .build();

        return videoTable.getItem(r -> r.key(key));
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

    public List<VideoRecording> findByUserId(String userId) {
        // Query expression banayo jo userId (partition key) se match kare
        QueryConditional queryConditional = QueryConditional.keyEqualTo(k -> k.partitionValue(userId));

        // query() method saari matching records ki list return karega
        return videoTable.query(r -> r.queryConditional(queryConditional))
                .items()
                .stream()
                .collect(Collectors.toList());
    }

    // 🔑 Correct Composite Key Lookup: Partition = userId, Sort = id
    public Optional<VideoRecording> getItem(String id) {
        Key key = Key.builder()
                .partitionValue(id)
                .build();

        return Optional.ofNullable(videoTable.getItem(r -> r.key(key)));
    }

    public void deleteById(String videoId, String userId) {
        Key key = Key.builder()
                .partitionValue(userId)
                .sortValue(videoId)
                .build();
        videoTable.deleteItem(r -> r.key(key));
    }
}