package com.daily_notes.notes.dto;

import java.time.LocalDate;

public record TaskDto(String name, String content,
                      String priority,
                      LocalDate dueDate,
                      String dueTime,
                      String meridiem,
                      String status) {
}
