
package com.dailynotes.auth.user.repository;

import com.dailynotes.auth.user.entity.UserEntity;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Repository;

import software.amazon.awssdk.enhanced.dynamodb.DynamoDbEnhancedClient;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbTable;
import software.amazon.awssdk.enhanced.dynamodb.TableSchema;
import software.amazon.awssdk.enhanced.dynamodb.Key;
import software.amazon.awssdk.enhanced.dynamodb.model.QueryConditional;

import java.util.Optional;

@Repository
public class UserRepository {

    private final DynamoDbTable<UserEntity> userTable;

    public UserRepository(
            DynamoDbEnhancedClient enhancedClient,
            @Value("${aws.dynamodb.users-table:Users}") String tableName) {

        this.userTable = enhancedClient.table(
                tableName,
                TableSchema.fromBean(UserEntity.class)
        );
    }

    public void save(UserEntity user) {
        userTable.putItem(user);
    }

    public Optional<UserEntity> findByUserId(String userId) {
        return Optional.ofNullable(
                userTable.getItem(
                        Key.builder()
                                .partitionValue(userId)
                                .build()
                )
        );
    }

    public Optional<UserEntity> findByEmail(String email) {

        return userTable.index("email-index")
                .query(QueryConditional.keyEqualTo(
                        Key.builder()
                                .partitionValue(email)
                                .build()
                ))
                .stream()
                .flatMap(page -> page.items().stream())
                .findFirst();
    }

    public void update(UserEntity user) {
        userTable.updateItem(user);
    }

    public void deleteByUserId(String userId) {
        userTable.deleteItem(
                Key.builder()
                        .partitionValue(userId)
                        .build()
        );
    }
}
