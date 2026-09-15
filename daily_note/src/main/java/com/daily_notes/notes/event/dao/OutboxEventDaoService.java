package com.daily_notes.notes.event.dao;

import com.daily_notes.notes.entity.OutboxEventEntity;

import java.util.List;

public interface OutboxEventDaoService {

    List<OutboxEventEntity> getPendingEvents();

    void markAsPublished(String eventId);

    void save(OutboxEventEntity event);
}