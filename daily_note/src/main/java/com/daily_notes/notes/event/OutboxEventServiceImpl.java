package com.daily_notes.notes.event;

import com.daily_notes.notes.entity.OutboxEventEntity;
import com.daily_notes.notes.event.dao.OutboxEventDaoService;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class OutboxEventServiceImpl implements OutboxEventService {

    private final OutboxEventDaoService outboxEventDaoService;

    public OutboxEventServiceImpl(
            OutboxEventDaoService outboxEventDaoService) {
        this.outboxEventDaoService = outboxEventDaoService;
    }

    @Override
    public List<OutboxEventEntity> getPendingEvents() {
        return outboxEventDaoService.getPendingEvents();
    }

    @Override
    public void markAsPublished(String eventId) {
        outboxEventDaoService.markAsPublished(eventId);
    }
}