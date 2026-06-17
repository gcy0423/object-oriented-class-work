import { Repository } from "../../../../shared/data/repository.js";
import { Entity } from "../../../../shared/domain/entity.js";

export class Room extends Entity {
  constructor(record) {
    super(record);
    this.title = record.title || "";
    this.courseId = record.courseId || null;
    this.assignmentId = record.assignmentId || null;
    this.groupId = record.groupId || null;
    this.ownerId = record.ownerId || "system";
    this.type = record.type || "course";
    this.description = record.description || "";
    this.visibility = record.visibility || "course";
    this.status = record.status || "active";
    this.pinned = Boolean(record.pinned);
    this.tags = Array.isArray(record.tags) ? record.tags : [];
  }
}

export class RoomMessage extends Entity {
  constructor(record) {
    super(record);
    this.roomId = record.roomId || "room_ood";
    this.authorId = record.authorId;
    this.content = record.content || "";
    this.threadRootId = record.threadRootId || null;
    this.sourceType = record.sourceType || "manual";
    this.attachments = Array.isArray(record.attachments) ? record.attachments : [];
    this.mentions = Array.isArray(record.mentions) ? record.mentions : [];
    this.metadata = record.metadata || {};
  }
}

export class RoomMember extends Entity {
  constructor(record) {
    super(record);
    this.roomId = record.roomId || "room_ood";
    this.userId = record.userId;
    this.displayName = record.displayName || record.userId || "";
    this.role = record.role || "member";
    this.status = record.status || "active";
    this.joinedAt = record.joinedAt || this.createdAt;
    this.lastSeenAt = record.lastSeenAt || null;
    this.notificationLevel = record.notificationLevel || "mentions";
  }
}

export class MessageReply extends Entity {
  constructor(record) {
    super(record);
    this.roomId = record.roomId || "room_ood";
    this.messageId = record.messageId;
    this.authorId = record.authorId;
    this.content = record.content || "";
    this.mentions = Array.isArray(record.mentions) ? record.mentions : [];
    this.metadata = record.metadata || {};
  }
}

export class Mention extends Entity {
  constructor(record) {
    super(record);
    this.roomId = record.roomId || "room_ood";
    this.messageId = record.messageId || null;
    this.replyId = record.replyId || null;
    this.actorId = record.actorId || "system";
    this.targetType = record.targetType || "user";
    this.targetId = record.targetId || "";
    this.label = record.label || record.targetId || "";
    this.status = record.status || "unread";
    this.context = record.context || "";
    this.readAt = record.readAt || null;
  }
}

export class CollaborationTask extends Entity {
  constructor(record) {
    super(record);
    this.roomId = record.roomId || "room_ood";
    this.sourceMessageId = record.sourceMessageId || null;
    this.title = record.title || "";
    this.description = record.description || "";
    this.assigneeId = record.assigneeId || "";
    this.createdBy = record.createdBy || "system";
    this.priority = record.priority || "medium";
    this.status = record.status || "open";
    this.dueAt = record.dueAt || null;
    this.completedAt = record.completedAt || null;
    this.labels = Array.isArray(record.labels) ? record.labels : [];
    this.acceptanceCriteria = Array.isArray(record.acceptanceCriteria) ? record.acceptanceCriteria : [];
  }
}

export class RoomSummary extends Entity {
  constructor(record) {
    super(record);
    this.roomId = record.roomId || "room_ood";
    this.generatedBy = record.generatedBy || "system";
    this.rangeStart = record.rangeStart || null;
    this.rangeEnd = record.rangeEnd || null;
    this.summary = record.summary || "";
    this.decisions = Array.isArray(record.decisions) ? record.decisions : [];
    this.actionItems = Array.isArray(record.actionItems) ? record.actionItems : [];
    this.risks = Array.isArray(record.risks) ? record.risks : [];
    this.participantCount = Number(record.participantCount || 0);
    this.messageCount = Number(record.messageCount || 0);
    this.taskCount = Number(record.taskCount || 0);
  }
}

export class RoomDecision extends Entity {
  constructor(record) {
    super(record);
    this.roomId = record.roomId || "room_ood";
    this.messageId = record.messageId || null;
    this.title = record.title || "";
    this.rationale = record.rationale || "";
    this.impact = record.impact || "";
    this.status = record.status || "proposed";
    this.createdBy = record.createdBy || "system";
    this.approvedBy = record.approvedBy || null;
    this.approvedAt = record.approvedAt || null;
    this.tags = Array.isArray(record.tags) ? record.tags : [];
  }
}

export class SharedResource extends Entity {
  constructor(record) {
    super(record);
    this.roomId = record.roomId || "room_ood";
    this.title = record.title || "";
    this.url = record.url || "";
    this.type = record.type || "link";
    this.description = record.description || "";
    this.addedBy = record.addedBy || "system";
    this.visibility = record.visibility || "room";
    this.tags = Array.isArray(record.tags) ? record.tags : [];
  }
}

export class ChecklistItem extends Entity {
  constructor(record) {
    super(record);
    this.roomId = record.roomId || "room_ood";
    this.title = record.title || "";
    this.description = record.description || "";
    this.ownerId = record.ownerId || "";
    this.status = record.status || "open";
    this.dueAt = record.dueAt || null;
    this.sourceSummaryId = record.sourceSummaryId || null;
    this.sortOrder = Number(record.sortOrder || 0);
    this.completedAt = record.completedAt || null;
  }
}

export class HandoffNote extends Entity {
  constructor(record) {
    super(record);
    this.roomId = record.roomId || "room_ood";
    this.fromUserId = record.fromUserId || "system";
    this.toUserId = record.toUserId || "";
    this.title = record.title || "";
    this.context = record.context || "";
    this.blockers = Array.isArray(record.blockers) ? record.blockers : [];
    this.nextSteps = Array.isArray(record.nextSteps) ? record.nextSteps : [];
    this.status = record.status || "open";
    this.acceptedAt = record.acceptedAt || null;
    this.closedAt = record.closedAt || null;
  }
}

export class AuditRecord extends Entity {
  constructor(record) {
    super(record);
    this.actorId = record.actorId || "system";
    this.action = record.action || "unknown";
    this.resourceType = record.resourceType || "collaboration";
    this.resourceId = record.resourceId || "";
    this.roomId = record.roomId || null;
    this.summary = record.summary || "";
    this.before = record.before || null;
    this.after = record.after || null;
    this.metadata = record.metadata || {};
    this.occurredAt = record.occurredAt || this.createdAt;
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

export class RoomMemberRepository extends Repository {
  constructor(database) {
    super(database, "roomMembers", (record) => new RoomMember(record));
  }

  findByRoom(roomId) {
    return this.where((member) => member.roomId === roomId);
  }

  findByUser(userId) {
    return this.where((member) => member.userId === userId);
  }

  findMembership(roomId, userId) {
    return this.where((member) => member.roomId === roomId && member.userId === userId)[0] || null;
  }
}

export class MessageReplyRepository extends Repository {
  constructor(database) {
    super(database, "messageReplies", (record) => new MessageReply(record));
  }

  findByMessage(messageId) {
    return this.where((reply) => reply.messageId === messageId);
  }

  findByRoom(roomId) {
    return this.where((reply) => reply.roomId === roomId);
  }
}

export class MentionRepository extends Repository {
  constructor(database) {
    super(database, "mentions", (record) => new Mention(record));
  }

  findByRoom(roomId) {
    return this.where((mention) => mention.roomId === roomId);
  }

  findByTarget(targetId, status = "") {
    return this.where((mention) => mention.targetId === targetId && (!status || mention.status === status));
  }

  findByMessage(messageId) {
    return this.where((mention) => mention.messageId === messageId);
  }
}

export class CollaborationTaskRepository extends Repository {
  constructor(database) {
    super(database, "collaborationTasks", (record) => new CollaborationTask(record));
  }

  findByRoom(roomId) {
    return this.where((task) => task.roomId === roomId);
  }

  findByAssignee(assigneeId) {
    return this.where((task) => task.assigneeId === assigneeId);
  }

  findOpen() {
    return this.where((task) => task.status !== "done" && task.status !== "archived");
  }
}

export class RoomSummaryRepository extends Repository {
  constructor(database) {
    super(database, "roomSummaries", (record) => new RoomSummary(record));
  }

  findByRoom(roomId) {
    return this.where((summary) => summary.roomId === roomId);
  }

  latestByRoom(roomId, limit = 5) {
    return this.findByRoom(roomId)
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
      .slice(0, limit);
  }
}

export class RoomDecisionRepository extends Repository {
  constructor(database) {
    super(database, "roomDecisions", (record) => new RoomDecision(record));
  }

  findByRoom(roomId) {
    return this.where((decision) => decision.roomId === roomId);
  }
}

export class SharedResourceRepository extends Repository {
  constructor(database) {
    super(database, "sharedResources", (record) => new SharedResource(record));
  }

  findByRoom(roomId) {
    return this.where((resource) => resource.roomId === roomId);
  }
}

export class ChecklistItemRepository extends Repository {
  constructor(database) {
    super(database, "checklistItems", (record) => new ChecklistItem(record));
  }

  findByRoom(roomId) {
    return this.where((item) => item.roomId === roomId);
  }

  findOpenByRoom(roomId) {
    return this.where((item) => item.roomId === roomId && item.status !== "done" && item.status !== "archived");
  }
}

export class HandoffNoteRepository extends Repository {
  constructor(database) {
    super(database, "handoffNotes", (record) => new HandoffNote(record));
  }

  findByRoom(roomId) {
    return this.where((note) => note.roomId === roomId);
  }

  findOpenByUser(userId) {
    return this.where((note) => note.toUserId === userId && note.status !== "closed" && note.status !== "archived");
  }
}

export class AuditRepository extends Repository {
  constructor(database) {
    super(database, "auditRecords", (record) => new AuditRecord(record));
  }

  findByRoom(roomId) {
    return this.where((record) => record.roomId === roomId);
  }

  latest(limit = 80) {
    return this.all()
      .sort((a, b) => String(b.occurredAt).localeCompare(String(a.occurredAt)))
      .slice(0, limit);
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
