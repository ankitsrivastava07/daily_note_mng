/*
package com.daily_note.search_text_app.mapper;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;

@Component
public class CustomMapper {
    private static final ObjectMapper mapper = new ObjectMapper();

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

        } catch (JacksonException e) {
            throw new RuntimeException(
                    "Failed to convert JSON to object",
                    e
            );
        }
    }
}
*/
