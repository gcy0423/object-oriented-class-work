import { Repository } from "../../../../shared/data/repository.js";
import { Entity } from "../../../../shared/domain/entity.js";

export class Room extends Entity {
  constructor(record) {
    super(record);
    this.title = record.title || "";
    this.courseId = record.courseId || null;
  }
}

export class RoomMessage extends Entity {
  constructor(record) {
    super(record);
    this.roomId = record.roomId || "room_ood";
    this.authorId = record.authorId;
    this.content = record.content || "";
  }
}

export class ActivityLog extends Entity {
  constructor(record) {
    super(record);
    this.actorId = record.actorId || "system";
    this.type = record.type;
    this.summary = record.summary || "";
    this.payload = record.payload || {};
  }
}

export class CollaborationEvent extends Entity {
  constructor(record) {
    super(record);
    this.type = record.type;
    this.source = record.source || "collaboration-service";
    this.actorId = record.actorId || "system";
    this.summary = record.summary || "";
    this.payload = record.payload || {};
    this.occurredAt = record.occurredAt || this.createdAt;
  }
}

export class RoomRepository extends Repository {
  constructor(database) {
    super(database, "rooms", (record) => new Room(record));
  }
}

export class MessageRepository extends Repository {
  constructor(database) {
    super(database, "messages", (record) => new RoomMessage(record));
  }

  findByRoom(roomId) {
    return this.where((message) => message.roomId === roomId);
  }
}

export class ActivityLogRepository extends Repository {
  constructor(database) {
    super(database, "activityLogs", (record) => new ActivityLog(record));
  }

  latest(limit = 20) {
    return this.all()
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
      .slice(0, limit);
  }
}

export class EventRepository extends Repository {
  constructor(database) {
    super(database, "events", (record) => new CollaborationEvent(record));
  }
}
