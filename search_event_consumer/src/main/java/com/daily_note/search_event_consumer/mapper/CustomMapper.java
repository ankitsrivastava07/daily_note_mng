package com.daily_note.search_event_consumer.mapper;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class CustomMapper {
    private static final com.fasterxml.jackson.databind.ObjectMapper mapper = new ObjectMapper();
    private static Logger logger = LoggerFactory.getLogger(CustomMapper.class);

    public static <T> T mapToEntity(Object source, Class<T> targetType) {
        return mapper.convertValue(source, targetType);
    }

    public static <T> T mapJsonToEntity(
            String json,
            Class<T> targetType) {

        try {
            String actualJson = json;

            if (json.startsWith("\"") && json.endsWith("\"")) {
                actualJson = mapper.readValue(json, String.class);
            }

            logger.info("Map To Json Entity {}", actualJson);
            return mapper.readValue(actualJson, targetType);

        } catch (JsonProcessingException e) {
            logger.info("");
            throw new RuntimeException(
                    "Failed to convert JSON to object",
                    e
            );
        }
    }
}
