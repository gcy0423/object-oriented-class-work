import { ActivityLog, CollaborationEvent } from "../domain/collaboration.js";

export class ActivityService {
  constructor({ database, activityLogs, events, syncHub }) {
    this.database = database;
    this.activityLogs = activityLogs;
    this.events = events;
    this.syncHub = syncHub;
  }

  listLatest(limit = 20) {
    return this.activityLogs.latest(limit);
  }

  async record({ actorId, type, summary, payload = {} }) {
    const now = new Date().toISOString();
    const activity = new ActivityLog({
      id: this.database.nextId("log"),
      actorId: actorId || "system",
      type,
      summary,
      payload,
      createdAt: now,
      updatedAt: now
    });
    return this.activityLogs.save(activity);
  }

  async recordEvent({ type, source, actorId, summary, payload = {} }) {
    const now = new Date().toISOString();
    const event = new CollaborationEvent({
      id: this.database.nextId("evt"),
      type,
      source: source || "unknown",
      actorId: actorId || "system",
      summary,
      payload,
      occurredAt: now,
      createdAt: now,
      updatedAt: now
    });
    const savedEvent = await this.events.save(event);
    const activity = await this.record({
      actorId: event.actorId,
      type: event.type,
      summary: event.summary,
      payload: event.payload
    });
    this.syncHub.broadcast(event.type, savedEvent);
    return {
      event: savedEvent,
      activity
    };
  }
}
