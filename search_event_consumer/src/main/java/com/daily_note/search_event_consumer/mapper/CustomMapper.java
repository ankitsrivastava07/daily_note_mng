package com.daily_note.search_event_consumer.mapper;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class CustomMapper {
    private static final ObjectMapper mapper =
            new ObjectMapper()
                    .registerModule(new JavaTimeModule())
                    .disable(
                            SerializationFeature.WRITE_DATES_AS_TIMESTAMPS
                    ).configure(
                            DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES,
                            false);
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
            logger.info("JsonProcessingException has occured {}", e.getLocalizedMessage());
            throw new RuntimeException(
                    "Failed to convert JSON to object",
                    e
            );
        }
    }
}
