package com.daily_notes.notes.service;

import com.daily_notes.notes.dto.TaskDto;
import com.daily_notes.notes.entity.TaskEntity;
import com.daily_notes.notes.records.ApiResponse;

import java.util.List;

public interface TaskService {

    ApiResponse createTask(String userId, TaskDto taskDto);

    ApiResponse getAllTasksByUserId(String userId, Integer limit, String lastId, String search);
}
