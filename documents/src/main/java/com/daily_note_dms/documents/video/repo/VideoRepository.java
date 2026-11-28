package com.daily_note_dms.documents.video.repo;

import com.daily_note_dms.documents.video.entity.VideoRecording;
import org.springframework.stereotype.Repository;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbEnhancedClient;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbTable;
import software.amazon.awssdk.enhanced.dynamodb.Key;
import software.amazon.awssdk.enhanced.dynamodb.TableSchema;
import software.amazon.awssdk.enhanced.dynamodb.model.QueryConditional;
import software.amazon.awssdk.enhanced.dynamodb.model.QueryEnhancedRequest;

import java.time.Instant;
import java.util.Comparator;
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
        Instant now = Instant.now();
        // Created only once
        if (record.getCreatedAt() == null) {
            record.setCreatedAt(now.toString());
        }

        // Updated on every save
        // record.setUpdatedAt(now.toString());
        videoTable.putItem(record);
    }

    public void update(VideoRecording record) {
        record.setUpdatedAt(Instant.now().toString());
        videoTable.updateItem(record);
    }

    // Partition Key = userId (user_id), Sort Key = id
    public Optional<VideoRecording> getItem(String userId, String id) {
        if (userId == null || userId.isBlank() || id == null || id.isBlank()) {
            return Optional.empty();
        }
        Key key = Key.builder()
                .partitionValue(userId)
                .sortValue(id)
                .build();

        return Optional.ofNullable(videoTable.getItem(r -> r.key(key)));
    }

    public VideoRecording findById(String userId, String id) {
        return getItem(userId, id).orElse(null);
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
        QueryConditional queryConditional = QueryConditional.keyEqualTo(k ->
                k.partitionValue(userId));

        return videoTable
                .query(r ->
                        r.queryConditional(queryConditional))
                .items()
                .stream()
                .sorted(Comparator.comparing(VideoRecording::getCreatedAt,
                        Comparator
                                .nullsLast(Comparator.reverseOrder())).reversed())
                .collect(Collectors.toList());
    }

    public void deleteById(String userId, String videoId) {
        if (userId == null || userId.isBlank() || videoId == null || videoId.isBlank()) {
            return;
        }
        Key key = Key.builder()
                .partitionValue(userId)
                .sortValue(videoId)
                .build();
        videoTable.deleteItem(r -> r.key(key));
    }
}