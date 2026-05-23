import { Entity, Repository } from "./shared.js";

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
    this.actorId = record.actorId;
    this.type = record.type;
    this.summary = record.summary;
    this.payload = record.payload || {};
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
