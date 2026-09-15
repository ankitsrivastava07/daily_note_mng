package com.daily_notes.notes.event;

import com.daily_notes.notes.entity.OutboxEventEntity;

import java.util.List;

public interface OutboxEventService {

    List<OutboxEventEntity> getPendingEvents();

    void markAsPublished(String eventId);
}