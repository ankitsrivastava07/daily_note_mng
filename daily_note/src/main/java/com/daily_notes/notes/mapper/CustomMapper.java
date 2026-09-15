package com.daily_notes.notes.mapper;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;

public class CustomMapper {
    private final static ObjectMapper mapper = new ObjectMapper()
            .registerModule(new JavaTimeModule());

    public static <T> T mapToEntity(Object source, Class<T> targetType) {
        return mapper.convertValue(source, targetType);
    }

    public static String mapToJson(Object object) {
        try {
            return mapper.writeValueAsString(object);
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Failed to convert object to JSON", e);
        }
    }

    public static <T> T mapToJson(String json, Class<T> taskEntity) {
        try {
            return mapper.readValue(json, taskEntity);
        } catch (Exception e) {
            throw new RuntimeException("Error mapping TaskEntity to JSON", e);
        }
    }
}
