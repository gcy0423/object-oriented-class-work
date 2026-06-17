import { NotFoundError, ValidationError } from "../../../../shared/http/errors.js";
import { RoomMessage } from "../domain/collaboration.js";

function requireText(value, label) {
  if (!String(value || "").trim()) {
    throw new ValidationError(`${label}不能为空。`);
  }
  return String(value).trim();
}

export class CollaborationService {
  constructor({ database, rooms, messages, activity, syncHub }) {
    this.database = database;
    this.rooms = rooms;
    this.messages = messages;
    this.activity = activity;
    this.syncHub = syncHub;
  }

  roomMessages(roomId = "room_ood") {
    if (!this.rooms.findById(roomId)) {
      throw new NotFoundError("协作房间不存在。");
    }
    return this.messages
      .findByRoom(roomId)
      .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)))
      .slice(-80);
  }

  async sendMessage(user, input) {
    const roomId = input.roomId || "room_ood";
    if (!this.rooms.findById(roomId)) {
      throw new NotFoundError("协作房间不存在。");
    }
    const now = new Date().toISOString();
    const message = new RoomMessage({
      id: this.database.nextId("msg"),
      roomId,
      authorId: user.id,
      content: requireText(input.content, "消息内容"),
      createdAt: now,
      updatedAt: now
    });
    const saved = await this.messages.save(message);
    await this.activity.record({
      actorId: user.id,
      type: "message.created",
      summary: "发送协作消息",
      payload: { messageId: saved.id, roomId: saved.roomId }
    });
    this.syncHub.broadcast("message.created", saved);
    return saved;
  }
}
