package com.daily_notes.notes.dto;

public record TaskDto(String name,
                      String content,
                      String priority,
                      String dueDate,
                      String dueTime,
                      String userId,
                      String meridiem,
                      String status) {
}
