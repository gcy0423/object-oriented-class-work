import { NotFoundError, ValidationError } from "../../../../shared/http/errors.js";
import {
  AuditRecord,
  ChecklistItem,
  CollaborationTask,
  HandoffNote,
  Mention,
  MessageReply,
  Room,
  RoomDecision,
  RoomMember,
  RoomMessage,
  RoomSummary,
  SharedResource
} from "../domain/collaboration.js";

function requireText(value, label) {
  if (!String(value || "").trim()) {
    throw new ValidationError(`${label} is required.`);
  }
  return String(value).trim();
}

function optionalText(value) {
  return String(value || "").trim();
}

function normalizeList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => optionalText(item)).filter(Boolean);
  }
  return String(value || "")
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function unique(items) {
  return [...new Set(items.filter(Boolean))];
}

function parseLimit(value, fallback = 80, max = 200) {
  const parsed = Number(value || fallback);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.min(Math.floor(parsed), max);
}

function byCreatedAsc(a, b) {
  return String(a.createdAt).localeCompare(String(b.createdAt));
}

function byCreatedDesc(a, b) {
  return String(b.createdAt).localeCompare(String(a.createdAt));
}

function dateOrNull(value) {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function compactRoomType(value) {
  const type = optionalText(value) || "course";
  return ["course", "assignment", "group", "ad_hoc"].includes(type) ? type : "course";
}

function compactVisibility(value) {
  const visibility = optionalText(value) || "course";
  return ["course", "group", "private", "public"].includes(visibility) ? visibility : "course";
}

function compactTaskStatus(value, fallback = "open") {
  const status = optionalText(value) || fallback;
  return ["open", "doing", "blocked", "done", "archived"].includes(status) ? status : fallback;
}

function compactChecklistStatus(value, fallback = "open") {
  const status = optionalText(value) || fallback;
  return ["open", "doing", "blocked", "done", "archived"].includes(status) ? status : fallback;
}

function compactDecisionStatus(value, fallback = "proposed") {
  const status = optionalText(value) || fallback;
  return ["proposed", "accepted", "rejected", "superseded"].includes(status) ? status : fallback;
}

function compactHandoffStatus(value, fallback = "open") {
  const status = optionalText(value) || fallback;
  return ["open", "accepted", "closed", "archived"].includes(status) ? status : fallback;
}

function compactPriority(value) {
  const priority = optionalText(value) || "medium";
  return ["low", "medium", "high", "urgent"].includes(priority) ? priority : "medium";
}

function compactResourceType(value) {
  const type = optionalText(value) || "link";
  return ["link", "document", "repository", "dataset", "rubric", "meeting_note"].includes(type) ? type : "link";
}

function extractMentionLabels(content) {
  const labels = [];
  const pattern = /@([A-Za-z0-9_\-\u4e00-\u9fa5]+)/g;
  let match = pattern.exec(content || "");
  while (match) {
    labels.push(match[1]);
    match = pattern.exec(content || "");
  }
  return unique(labels);
}

function normalizeMentionTargets(inputTargets = [], content = "") {
  const fromText = extractMentionLabels(content).map((label) => ({
    targetType: label.startsWith("group_") || label.startsWith("team_") ? "group" : "user",
    targetId: label,
    label
  }));
  const fromInput = Array.isArray(inputTargets)
    ? inputTargets.map((target) => ({
        targetType: target.targetType || "user",
        targetId: target.targetId || target.userId || target.groupId || target.label,
        label: target.label || target.targetId || target.userId || target.groupId || ""
      }))
    : [];
  const seen = new Set();
  return [...fromText, ...fromInput].filter((target) => {
    if (!target.targetId) {
      return false;
    }
    const key = `${target.targetType}:${target.targetId}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function messagePreview(messages) {
  if (!messages.length) {
    return "No discussion content yet.";
  }
  return messages
    .slice(-6)
    .map((message) => `${message.authorId}: ${String(message.content || "").slice(0, 120)}`)
    .join("\n");
}

function inferDecisions(messages) {
  const decisionKeywords = ["decision", "decide", "决定", "确认", "结论"];
  return messages
    .filter((message) => decisionKeywords.some((keyword) => String(message.content || "").toLowerCase().includes(keyword)))
    .slice(-5)
    .map((message) => String(message.content || "").slice(0, 160));
}

function inferRisks(messages, tasks) {
  const riskKeywords = ["risk", "block", "blocked", "delay", "风险", "阻塞", "延期"];
  const messageRisks = messages
    .filter((message) => riskKeywords.some((keyword) => String(message.content || "").toLowerCase().includes(keyword)))
    .slice(-4)
    .map((message) => String(message.content || "").slice(0, 160));
  const blockedTasks = tasks
    .filter((task) => task.status === "blocked")
    .map((task) => `Blocked task: ${task.title}`);
  return unique([...messageRisks, ...blockedTasks]).slice(0, 8);
}

export class CollaborationService {
  constructor({
    database,
    rooms,
    members,
    messages,
    replies,
    mentions,
    tasks,
    summaries,
    decisions,
    resources,
    checklist,
    handoffs,
    audits,
    activity,
    syncHub
  }) {
    this.database = database;
    this.rooms = rooms;
    this.members = members;
    this.messages = messages;
    this.replies = replies;
    this.mentions = mentions;
    this.tasks = tasks;
    this.summaries = summaries;
    this.decisions = decisions;
    this.resources = resources;
    this.checklist = checklist;
    this.handoffs = handoffs;
    this.audits = audits;
    this.activity = activity;
    this.syncHub = syncHub;
  }

  requireRoom(roomId = "room_ood") {
    const room = this.rooms.findById(roomId);
    if (!room) {
      throw new NotFoundError("Collaboration room not found.");
    }
    return room;
  }

  requireMessage(messageId) {
    const message = this.messages.findById(messageId);
    if (!message) {
      throw new NotFoundError("Collaboration message not found.");
    }
    return message;
  }

  roomStats(room, user) {
    const messages = this.messages.findByRoom(room.id);
    const replies = this.replies.findByRoom(room.id);
    const tasks = this.tasks.findByRoom(room.id);
    const mentions = this.mentions.findByRoom(room.id);
    const members = this.members.findByRoom(room.id);
    const decisions = this.decisions.findByRoom(room.id);
    const resources = this.resources.findByRoom(room.id);
    const checklist = this.checklist.findByRoom(room.id);
    const handoffs = this.handoffs.findByRoom(room.id);
    const lastMessageAt = [...messages, ...replies]
      .map((item) => item.createdAt)
      .filter(Boolean)
      .sort((a, b) => String(b).localeCompare(String(a)))[0] || room.updatedAt;
    return {
      memberCount: members.length,
      messageCount: messages.length,
      replyCount: replies.length,
      openTaskCount: tasks.filter((task) => task.status !== "done" && task.status !== "archived").length,
      doneTaskCount: tasks.filter((task) => task.status === "done").length,
      decisionCount: decisions.length,
      resourceCount: resources.length,
      openChecklistCount: checklist.filter((item) => item.status !== "done" && item.status !== "archived").length,
      doneChecklistCount: checklist.filter((item) => item.status === "done").length,
      openHandoffCount: handoffs.filter((note) => note.status !== "closed" && note.status !== "archived").length,
      unreadMentionCount: mentions.filter((mention) => mention.targetId === user?.id && mention.status === "unread").length,
      lastMessageAt
    };
  }

  decorateRoom(room, user) {
    return {
      ...room.toJSON(),
      stats: this.roomStats(room, user),
      membership: user?.id ? this.members.findMembership(room.id, user.id) : null
    };
  }

  listRooms(user, filters = {}) {
    const query = optionalText(filters.q).toLowerCase();
    return this.rooms
      .all()
      .filter((room) => !filters.courseId || room.courseId === filters.courseId)
      .filter((room) => !filters.type || room.type === filters.type)
      .filter((room) => !filters.status || room.status === filters.status)
      .filter((room) => !query || `${room.title} ${room.description} ${room.tags.join(" ")}`.toLowerCase().includes(query))
      .sort((a, b) => {
        if (a.pinned !== b.pinned) {
          return a.pinned ? -1 : 1;
        }
        return String(this.roomStats(b, user).lastMessageAt).localeCompare(String(this.roomStats(a, user).lastMessageAt));
      })
      .map((room) => this.decorateRoom(room, user));
  }

  async createRoom(user, input = {}) {
    const now = new Date().toISOString();
    const room = new Room({
      id: this.database.nextId("room"),
      title: requireText(input.title, "Room title"),
      courseId: input.courseId || null,
      assignmentId: input.assignmentId || null,
      groupId: input.groupId || null,
      ownerId: user.id,
      type: compactRoomType(input.type),
      description: optionalText(input.description),
      visibility: compactVisibility(input.visibility),
      status: "active",
      pinned: Boolean(input.pinned),
      tags: normalizeList(input.tags),
      createdAt: now,
      updatedAt: now
    });
    const saved = await this.rooms.save(room);
    await this.ensureMember(saved.id, {
      userId: user.id,
      displayName: user.name || user.id,
      role: "owner",
      status: "active",
      notificationLevel: "all"
    });
    for (const member of Array.isArray(input.members) ? input.members : []) {
      await this.ensureMember(saved.id, member);
    }
    await this.activity.record({
      actorId: user.id,
      type: "room.created",
      summary: `Created room ${saved.title}`,
      payload: { roomId: saved.id, type: saved.type }
    });
    await this.recordAudit(user, "room.created", "room", saved.id, saved.id, null, saved.toJSON());
    this.syncHub.broadcast("room.created", saved);
    return this.decorateRoom(saved, user);
  }

  async ensureMember(roomId, input = {}) {
    const userId = requireText(input.userId || input.id, "Member user");
    const existing = this.members.findMembership(roomId, userId);
    const now = new Date().toISOString();
    const member = new RoomMember({
      ...(existing ? existing.toJSON() : {}),
      id: existing?.id || this.database.nextId("member"),
      roomId,
      userId,
      displayName: optionalText(input.displayName || input.name) || userId,
      role: input.role || existing?.role || "member",
      status: input.status || existing?.status || "active",
      joinedAt: existing?.joinedAt || now,
      lastSeenAt: existing?.lastSeenAt || null,
      notificationLevel: input.notificationLevel || existing?.notificationLevel || "mentions",
      createdAt: existing?.createdAt || now,
      updatedAt: now
    });
    return this.members.save(member);
  }

  async addMember(user, roomId, input = {}) {
    const room = this.requireRoom(roomId);
    const before = this.members.findMembership(roomId, input.userId || input.id)?.toJSON() || null;
    const member = await this.ensureMember(roomId, input);
    await this.activity.record({
      actorId: user.id,
      type: "room.member.changed",
      summary: `Updated room member ${member.displayName}`,
      payload: { roomId, memberId: member.id, userId: member.userId }
    });
    await this.recordAudit(user, "room.member.changed", "roomMember", member.id, room.id, before, member.toJSON());
    this.syncHub.broadcast("room.member.changed", { roomId, member });
    return member;
  }

  async touchMember(user, roomId) {
    if (!user?.id) {
      return null;
    }
    const member = this.members.findMembership(roomId, user.id);
    if (!member) {
      return null;
    }
    const updated = new RoomMember({
      ...member.toJSON(),
      lastSeenAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    return this.members.save(updated);
  }

  hydrateMessage(message) {
    const replies = this.replies
      .findByMessage(message.id)
      .sort(byCreatedAsc)
      .map((reply) => ({
        ...reply.toJSON(),
        mentions: this.mentions.where((mention) => mention.replyId === reply.id).map((mention) => mention.toJSON())
      }));
    const mentions = this.mentions.findByMessage(message.id).map((mention) => mention.toJSON());
    return {
      ...message.toJSON(),
      replies,
      mentions
    };
  }

  roomMessages(roomId = "room_ood", options = {}) {
    this.requireRoom(roomId);
    const limit = parseLimit(options.limit, 80, 200);
    return this.messages
      .findByRoom(roomId)
      .sort(byCreatedAsc)
      .slice(-limit)
      .map((message) => this.hydrateMessage(message));
  }

  getRoomWorkspace(user, roomId = "room_ood") {
    const room = this.requireRoom(roomId);
    this.touchMember(user, roomId).catch(() => {});
    const messages = this.roomMessages(roomId, { limit: 120 });
    const tasks = this.tasks.findByRoom(roomId).sort(byCreatedDesc).map((task) => task.toJSON());
    const summaries = this.summaries.latestByRoom(roomId, 6).map((summary) => summary.toJSON());
    const decisions = this.decisions.findByRoom(roomId).sort(byCreatedDesc).map((decision) => decision.toJSON());
    const resources = this.resources.findByRoom(roomId).sort(byCreatedDesc).map((resource) => resource.toJSON());
    const checklist = this.checklist.findByRoom(roomId)
      .sort((a, b) => a.sortOrder - b.sortOrder || String(a.createdAt).localeCompare(String(b.createdAt)))
      .map((item) => item.toJSON());
    const handoffs = this.handoffs.findByRoom(roomId).sort(byCreatedDesc).map((note) => note.toJSON());
    const audit = this.audits.findByRoom(roomId).sort((a, b) => String(b.occurredAt).localeCompare(String(a.occurredAt))).slice(0, 30);
    const mentions = this.mentions.findByRoom(roomId).sort(byCreatedDesc).map((mention) => mention.toJSON());
    const members = this.members.findByRoom(roomId).sort((a, b) => String(a.displayName).localeCompare(String(b.displayName)));
    return {
      room: this.decorateRoom(room, user),
      members: members.map((member) => member.toJSON()),
      messages,
      mentions,
      tasks,
      summaries,
      decisions,
      resources,
      checklist,
      handoffs,
      insight: this.roomInsight(user, roomId),
      audit: audit.map((record) => record.toJSON())
    };
  }

  async sendMessage(user, input = {}) {
    const room = this.requireRoom(input.roomId || "room_ood");
    const now = new Date().toISOString();
    const content = requireText(input.content, "Message content");
    const mentionTargets = normalizeMentionTargets(input.mentionTargets, content);
    const message = new RoomMessage({
      id: this.database.nextId("msg"),
      roomId: room.id,
      authorId: user.id,
      content,
      threadRootId: input.threadRootId || null,
      sourceType: input.sourceType || "manual",
      attachments: Array.isArray(input.attachments) ? input.attachments : [],
      mentions: mentionTargets.map((target) => target.targetId),
      metadata: input.metadata || {},
      createdAt: now,
      updatedAt: now
    });
    const saved = await this.messages.save(message);
    const savedMentions = await this.createMentionRecords(user, {
      roomId: room.id,
      messageId: saved.id,
      content,
      targets: mentionTargets
    });
    await this.activity.record({
      actorId: user.id,
      type: "message.created",
      summary: "Sent collaboration message",
      payload: { messageId: saved.id, roomId: saved.roomId, mentionCount: savedMentions.length }
    });
    await this.recordAudit(user, "message.created", "message", saved.id, room.id, null, saved.toJSON(), {
      mentionCount: savedMentions.length
    });
    this.syncHub.broadcast("message.created", { ...saved.toJSON(), mentions: savedMentions });
    return this.hydrateMessage(saved);
  }

  async replyToMessage(user, messageId, input = {}) {
    const parent = this.requireMessage(messageId);
    const room = this.requireRoom(parent.roomId);
    const now = new Date().toISOString();
    const content = requireText(input.content, "Reply content");
    const mentionTargets = normalizeMentionTargets(input.mentionTargets, content);
    const reply = new MessageReply({
      id: this.database.nextId("reply"),
      roomId: room.id,
      messageId: parent.id,
      authorId: user.id,
      content,
      mentions: mentionTargets.map((target) => target.targetId),
      metadata: input.metadata || {},
      createdAt: now,
      updatedAt: now
    });
    const saved = await this.replies.save(reply);
    const savedMentions = await this.createMentionRecords(user, {
      roomId: room.id,
      messageId: parent.id,
      replyId: saved.id,
      content,
      targets: mentionTargets
    });
    await this.activity.record({
      actorId: user.id,
      type: "message.replied",
      summary: `Replied in room ${room.title}`,
      payload: { roomId: room.id, messageId: parent.id, replyId: saved.id, mentionCount: savedMentions.length }
    });
    await this.recordAudit(user, "message.replied", "messageReply", saved.id, room.id, null, saved.toJSON());
    this.syncHub.broadcast("message.replied", { roomId: room.id, messageId: parent.id, reply: saved });
    return {
      ...saved.toJSON(),
      mentions: savedMentions
    };
  }

  async createMentionRecords(user, { roomId, messageId, replyId = null, content = "", targets = [] }) {
    const now = new Date().toISOString();
    const records = [];
    for (const target of targets) {
      const mention = new Mention({
        id: this.database.nextId("mention"),
        roomId,
        messageId,
        replyId,
        actorId: user.id,
        targetType: target.targetType || "user",
        targetId: target.targetId,
        label: target.label || target.targetId,
        status: "unread",
        context: String(content || "").slice(0, 240),
        createdAt: now,
        updatedAt: now
      });
      const saved = await this.mentions.save(mention);
      records.push(saved.toJSON());
    }
    if (records.length) {
      this.syncHub.broadcast("mention.created", { roomId, messageId, mentions: records });
    }
    return records;
  }

  listMentions(user, filters = {}) {
    const targetId = filters.targetId || user.id;
    return this.mentions
      .findByTarget(targetId, filters.status || "")
      .filter((mention) => !filters.roomId || mention.roomId === filters.roomId)
      .sort(byCreatedDesc)
      .slice(0, parseLimit(filters.limit, 80, 200))
      .map((mention) => ({
        ...mention.toJSON(),
        roomTitle: this.rooms.findById(mention.roomId)?.title || mention.roomId
      }));
  }

  async markMentionRead(user, mentionId) {
    const mention = this.mentions.findById(mentionId);
    if (!mention) {
      throw new NotFoundError("Mention not found.");
    }
    const before = mention.toJSON();
    const updated = new Mention({
      ...before,
      status: "read",
      readAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    const saved = await this.mentions.save(updated);
    await this.recordAudit(user, "mention.read", "mention", saved.id, saved.roomId, before, saved.toJSON());
    this.syncHub.broadcast("mention.read", saved);
    return saved;
  }

  listTasks(user, filters = {}) {
    return this.tasks
      .all()
      .filter((task) => !filters.roomId || task.roomId === filters.roomId)
      .filter((task) => !filters.status || task.status === filters.status)
      .filter((task) => !filters.assigneeId || task.assigneeId === filters.assigneeId)
      .filter((task) => !filters.mine || task.assigneeId === user.id || task.createdBy === user.id)
      .sort(byCreatedDesc)
      .slice(0, parseLimit(filters.limit, 100, 300))
      .map((task) => ({
        ...task.toJSON(),
        roomTitle: this.rooms.findById(task.roomId)?.title || task.roomId
      }));
  }

  async createTask(user, input = {}) {
    const room = this.requireRoom(input.roomId || "room_ood");
    const now = new Date().toISOString();
    if (input.sourceMessageId) {
      this.requireMessage(input.sourceMessageId);
    }
    const task = new CollaborationTask({
      id: this.database.nextId("ctask"),
      roomId: room.id,
      sourceMessageId: input.sourceMessageId || null,
      title: requireText(input.title, "Task title"),
      description: optionalText(input.description),
      assigneeId: optionalText(input.assigneeId || input.assignee),
      createdBy: user.id,
      priority: compactPriority(input.priority),
      status: compactTaskStatus(input.status, "open"),
      dueAt: dateOrNull(input.dueAt),
      labels: normalizeList(input.labels),
      acceptanceCriteria: normalizeList(input.acceptanceCriteria),
      createdAt: now,
      updatedAt: now
    });
    const saved = await this.tasks.save(task);
    await this.activity.record({
      actorId: user.id,
      type: "collaboration.task.created",
      summary: `Created collaboration task ${saved.title}`,
      payload: { taskId: saved.id, roomId: saved.roomId, assigneeId: saved.assigneeId }
    });
    await this.recordAudit(user, "collaboration.task.created", "collaborationTask", saved.id, room.id, null, saved.toJSON());
    this.syncHub.broadcast("collaboration.task.created", saved);
    return saved;
  }

  async updateTask(user, taskId, input = {}) {
    const task = this.tasks.findById(taskId);
    if (!task) {
      throw new NotFoundError("Collaboration task not found.");
    }
    const before = task.toJSON();
    const nextStatus = input.status ? compactTaskStatus(input.status, task.status) : task.status;
    const updated = new CollaborationTask({
      ...before,
      title: input.title !== undefined ? requireText(input.title, "Task title") : task.title,
      description: input.description !== undefined ? optionalText(input.description) : task.description,
      assigneeId: input.assigneeId !== undefined ? optionalText(input.assigneeId) : task.assigneeId,
      priority: input.priority !== undefined ? compactPriority(input.priority) : task.priority,
      status: nextStatus,
      dueAt: input.dueAt !== undefined ? dateOrNull(input.dueAt) : task.dueAt,
      completedAt: nextStatus === "done" ? task.completedAt || new Date().toISOString() : null,
      labels: input.labels !== undefined ? normalizeList(input.labels) : task.labels,
      acceptanceCriteria: input.acceptanceCriteria !== undefined ? normalizeList(input.acceptanceCriteria) : task.acceptanceCriteria,
      updatedAt: new Date().toISOString()
    });
    const saved = await this.tasks.save(updated);
    await this.activity.record({
      actorId: user.id,
      type: "collaboration.task.updated",
      summary: `Updated collaboration task ${saved.title}`,
      payload: { taskId: saved.id, roomId: saved.roomId, status: saved.status }
    });
    await this.recordAudit(user, "collaboration.task.updated", "collaborationTask", saved.id, saved.roomId, before, saved.toJSON());
    this.syncHub.broadcast("collaboration.task.updated", saved);
    return saved;
  }

  async createSummary(user, input = {}) {
    const room = this.requireRoom(input.roomId || "room_ood");
    const now = new Date().toISOString();
    const messages = this.messages.findByRoom(room.id).sort(byCreatedAsc);
    const replies = this.replies.findByRoom(room.id).sort(byCreatedAsc);
    const tasks = this.tasks.findByRoom(room.id);
    const combined = [...messages, ...replies].sort(byCreatedAsc);
    const participants = unique(combined.map((item) => item.authorId));
    const actionItems = tasks
      .filter((task) => task.status !== "done" && task.status !== "archived")
      .slice(0, 8)
      .map((task) => ({
        taskId: task.id,
        title: task.title,
        assigneeId: task.assigneeId,
        status: task.status,
        dueAt: task.dueAt
      }));
    const summary = new RoomSummary({
      id: this.database.nextId("summary"),
      roomId: room.id,
      generatedBy: user.id,
      rangeStart: combined[0]?.createdAt || null,
      rangeEnd: combined[combined.length - 1]?.createdAt || null,
      summary: optionalText(input.summary) || `Discussion summary for ${room.title}:\n${messagePreview(combined)}`,
      decisions: normalizeList(input.decisions).length ? normalizeList(input.decisions) : inferDecisions(combined),
      actionItems: Array.isArray(input.actionItems) && input.actionItems.length ? input.actionItems : actionItems,
      risks: normalizeList(input.risks).length ? normalizeList(input.risks) : inferRisks(combined, tasks),
      participantCount: participants.length,
      messageCount: combined.length,
      taskCount: tasks.length,
      createdAt: now,
      updatedAt: now
    });
    const saved = await this.summaries.save(summary);
    await this.activity.record({
      actorId: user.id,
      type: "room.summary.created",
      summary: `Generated summary for ${room.title}`,
      payload: { roomId: room.id, summaryId: saved.id, messageCount: saved.messageCount }
    });
    await this.recordAudit(user, "room.summary.created", "roomSummary", saved.id, room.id, null, saved.toJSON());
    this.syncHub.broadcast("room.summary.created", saved);
    return saved;
  }

  listDecisions(user, filters = {}) {
    return this.decisions
      .all()
      .filter((decision) => !filters.roomId || decision.roomId === filters.roomId)
      .filter((decision) => !filters.status || decision.status === filters.status)
      .sort(byCreatedDesc)
      .slice(0, parseLimit(filters.limit, 80, 200))
      .map((decision) => ({
        ...decision.toJSON(),
        roomTitle: this.rooms.findById(decision.roomId)?.title || decision.roomId
      }));
  }

  async createDecision(user, input = {}) {
    const room = this.requireRoom(input.roomId || "room_ood");
    if (input.messageId) {
      this.requireMessage(input.messageId);
    }
    const now = new Date().toISOString();
    const status = compactDecisionStatus(input.status);
    const decision = new RoomDecision({
      id: this.database.nextId("decision"),
      roomId: room.id,
      messageId: input.messageId || null,
      title: requireText(input.title, "Decision title"),
      rationale: optionalText(input.rationale),
      impact: optionalText(input.impact),
      status,
      createdBy: user.id,
      approvedBy: status === "accepted" ? user.id : null,
      approvedAt: status === "accepted" ? now : null,
      tags: normalizeList(input.tags),
      createdAt: now,
      updatedAt: now
    });
    const saved = await this.decisions.save(decision);
    await this.activity.record({
      actorId: user.id,
      type: "room.decision.created",
      summary: `Recorded decision ${saved.title}`,
      payload: { roomId: room.id, decisionId: saved.id, status: saved.status }
    });
    await this.recordAudit(user, "room.decision.created", "roomDecision", saved.id, room.id, null, saved.toJSON());
    this.syncHub.broadcast("room.decision.created", saved);
    return saved;
  }

  listResources(user, filters = {}) {
    return this.resources
      .all()
      .filter((resource) => !filters.roomId || resource.roomId === filters.roomId)
      .filter((resource) => !filters.type || resource.type === filters.type)
      .sort(byCreatedDesc)
      .slice(0, parseLimit(filters.limit, 80, 200))
      .map((resource) => ({
        ...resource.toJSON(),
        roomTitle: this.rooms.findById(resource.roomId)?.title || resource.roomId
      }));
  }

  async createResource(user, input = {}) {
    const room = this.requireRoom(input.roomId || "room_ood");
    const now = new Date().toISOString();
    const resource = new SharedResource({
      id: this.database.nextId("resource"),
      roomId: room.id,
      title: requireText(input.title, "Resource title"),
      url: requireText(input.url, "Resource URL"),
      type: compactResourceType(input.type),
      description: optionalText(input.description),
      addedBy: user.id,
      visibility: input.visibility || "room",
      tags: normalizeList(input.tags),
      createdAt: now,
      updatedAt: now
    });
    const saved = await this.resources.save(resource);
    await this.activity.record({
      actorId: user.id,
      type: "room.resource.created",
      summary: `Shared resource ${saved.title}`,
      payload: { roomId: room.id, resourceId: saved.id, type: saved.type }
    });
    await this.recordAudit(user, "room.resource.created", "sharedResource", saved.id, room.id, null, saved.toJSON());
    this.syncHub.broadcast("room.resource.created", saved);
    return saved;
  }

  listChecklist(user, filters = {}) {
    return this.checklist
      .all()
      .filter((item) => !filters.roomId || item.roomId === filters.roomId)
      .filter((item) => !filters.status || item.status === filters.status)
      .filter((item) => !filters.ownerId || item.ownerId === filters.ownerId)
      .sort((a, b) => a.sortOrder - b.sortOrder || String(a.createdAt).localeCompare(String(b.createdAt)))
      .slice(0, parseLimit(filters.limit, 120, 300))
      .map((item) => ({
        ...item.toJSON(),
        roomTitle: this.rooms.findById(item.roomId)?.title || item.roomId
      }));
  }

  async createChecklistItem(user, input = {}) {
    const room = this.requireRoom(input.roomId || "room_ood");
    const now = new Date().toISOString();
    const item = new ChecklistItem({
      id: this.database.nextId("check"),
      roomId: room.id,
      title: requireText(input.title, "Checklist item title"),
      description: optionalText(input.description),
      ownerId: optionalText(input.ownerId || input.assigneeId),
      status: compactChecklistStatus(input.status),
      dueAt: dateOrNull(input.dueAt),
      sourceSummaryId: input.sourceSummaryId || null,
      sortOrder: Number(input.sortOrder || this.checklist.findByRoom(room.id).length + 1),
      createdAt: now,
      updatedAt: now
    });
    const saved = await this.checklist.save(item);
    await this.activity.record({
      actorId: user.id,
      type: "room.checklist.created",
      summary: `Added checklist item ${saved.title}`,
      payload: { roomId: room.id, checklistItemId: saved.id, ownerId: saved.ownerId }
    });
    await this.recordAudit(user, "room.checklist.created", "checklistItem", saved.id, room.id, null, saved.toJSON());
    this.syncHub.broadcast("room.checklist.created", saved);
    return saved;
  }

  async updateChecklistItem(user, itemId, input = {}) {
    const item = this.checklist.findById(itemId);
    if (!item) {
      throw new NotFoundError("Checklist item not found.");
    }
    const before = item.toJSON();
    const nextStatus = input.status ? compactChecklistStatus(input.status, item.status) : item.status;
    const updated = new ChecklistItem({
      ...before,
      title: input.title !== undefined ? requireText(input.title, "Checklist item title") : item.title,
      description: input.description !== undefined ? optionalText(input.description) : item.description,
      ownerId: input.ownerId !== undefined ? optionalText(input.ownerId) : item.ownerId,
      status: nextStatus,
      dueAt: input.dueAt !== undefined ? dateOrNull(input.dueAt) : item.dueAt,
      sortOrder: input.sortOrder !== undefined ? Number(input.sortOrder || 0) : item.sortOrder,
      completedAt: nextStatus === "done" ? item.completedAt || new Date().toISOString() : null,
      updatedAt: new Date().toISOString()
    });
    const saved = await this.checklist.save(updated);
    await this.activity.record({
      actorId: user.id,
      type: "room.checklist.updated",
      summary: `Updated checklist item ${saved.title}`,
      payload: { roomId: saved.roomId, checklistItemId: saved.id, status: saved.status }
    });
    await this.recordAudit(user, "room.checklist.updated", "checklistItem", saved.id, saved.roomId, before, saved.toJSON());
    this.syncHub.broadcast("room.checklist.updated", saved);
    return saved;
  }

  listHandoffs(user, filters = {}) {
    return this.handoffs
      .all()
      .filter((note) => !filters.roomId || note.roomId === filters.roomId)
      .filter((note) => !filters.status || note.status === filters.status)
      .filter((note) => !filters.toUserId || note.toUserId === filters.toUserId)
      .filter((note) => !filters.mine || note.toUserId === user.id || note.fromUserId === user.id)
      .sort(byCreatedDesc)
      .slice(0, parseLimit(filters.limit, 80, 200))
      .map((note) => ({
        ...note.toJSON(),
        roomTitle: this.rooms.findById(note.roomId)?.title || note.roomId
      }));
  }

  async createHandoff(user, input = {}) {
    const room = this.requireRoom(input.roomId || "room_ood");
    const now = new Date().toISOString();
    const note = new HandoffNote({
      id: this.database.nextId("handoff"),
      roomId: room.id,
      fromUserId: user.id,
      toUserId: requireText(input.toUserId, "Handoff target user"),
      title: requireText(input.title, "Handoff title"),
      context: optionalText(input.context),
      blockers: normalizeList(input.blockers),
      nextSteps: normalizeList(input.nextSteps),
      status: compactHandoffStatus(input.status),
      createdAt: now,
      updatedAt: now
    });
    const saved = await this.handoffs.save(note);
    await this.activity.record({
      actorId: user.id,
      type: "room.handoff.created",
      summary: `Created handoff ${saved.title}`,
      payload: { roomId: room.id, handoffId: saved.id, toUserId: saved.toUserId }
    });
    await this.recordAudit(user, "room.handoff.created", "handoffNote", saved.id, room.id, null, saved.toJSON());
    this.syncHub.broadcast("room.handoff.created", saved);
    return saved;
  }

  async updateHandoff(user, handoffId, input = {}) {
    const note = this.handoffs.findById(handoffId);
    if (!note) {
      throw new NotFoundError("Handoff note not found.");
    }
    const before = note.toJSON();
    const status = input.status ? compactHandoffStatus(input.status, note.status) : note.status;
    const now = new Date().toISOString();
    const updated = new HandoffNote({
      ...before,
      toUserId: input.toUserId !== undefined ? requireText(input.toUserId, "Handoff target user") : note.toUserId,
      title: input.title !== undefined ? requireText(input.title, "Handoff title") : note.title,
      context: input.context !== undefined ? optionalText(input.context) : note.context,
      blockers: input.blockers !== undefined ? normalizeList(input.blockers) : note.blockers,
      nextSteps: input.nextSteps !== undefined ? normalizeList(input.nextSteps) : note.nextSteps,
      status,
      acceptedAt: status === "accepted" ? note.acceptedAt || now : note.acceptedAt,
      closedAt: status === "closed" ? note.closedAt || now : null,
      updatedAt: now
    });
    const saved = await this.handoffs.save(updated);
    await this.activity.record({
      actorId: user.id,
      type: "room.handoff.updated",
      summary: `Updated handoff ${saved.title}`,
      payload: { roomId: saved.roomId, handoffId: saved.id, status: saved.status }
    });
    await this.recordAudit(user, "room.handoff.updated", "handoffNote", saved.id, saved.roomId, before, saved.toJSON());
    this.syncHub.broadcast("room.handoff.updated", saved);
    return saved;
  }

  roomInsight(user, roomId = "room_ood") {
    const room = this.requireRoom(roomId);
    const messages = this.messages.findByRoom(roomId);
    const replies = this.replies.findByRoom(roomId);
    const tasks = this.tasks.findByRoom(roomId);
    const mentions = this.mentions.findByRoom(roomId);
    const decisions = this.decisions.findByRoom(roomId);
    const resources = this.resources.findByRoom(roomId);
    const checklist = this.checklist.findByRoom(roomId);
    const handoffs = this.handoffs.findByRoom(roomId);
    const combined = [...messages, ...replies];
    const since = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recentMessages = combined.filter((item) => new Date(item.createdAt).getTime() >= since);
    const participants = unique(combined.map((item) => item.authorId));
    const doneTasks = tasks.filter((task) => task.status === "done").length;
    const openTasks = tasks.filter((task) => task.status !== "done" && task.status !== "archived");
    const blockedTasks = tasks.filter((task) => task.status === "blocked");
    const doneChecklist = checklist.filter((item) => item.status === "done").length;
    const openChecklist = checklist.filter((item) => item.status !== "done" && item.status !== "archived");
    const taskCompletionRate = tasks.length ? Math.round((doneTasks / tasks.length) * 100) : 0;
    const checklistCompletionRate = checklist.length ? Math.round((doneChecklist / checklist.length) * 100) : 0;
    const unreadMentions = mentions.filter((mention) => mention.status === "unread");
    const acceptedDecisions = decisions.filter((decision) => decision.status === "accepted").length;
    const openHandoffs = handoffs.filter((note) => note.status !== "closed" && note.status !== "archived");
    const healthScore = Math.max(
      0,
      Math.min(
        100,
        55
          + Math.min(20, recentMessages.length * 2)
          + Math.round(taskCompletionRate * 0.15)
          + Math.round(checklistCompletionRate * 0.1)
          + Math.min(10, acceptedDecisions * 2)
          - blockedTasks.length * 10
          - openHandoffs.length * 2
          - Math.min(15, unreadMentions.length * 3)
      )
    );
    const risks = [
      ...blockedTasks.map((task) => `Blocked task: ${task.title}`),
      ...openTasks.filter((task) => task.dueAt && new Date(task.dueAt).getTime() < Date.now()).map((task) => `Overdue task: ${task.title}`),
      ...openChecklist.filter((item) => item.dueAt && new Date(item.dueAt).getTime() < Date.now()).map((item) => `Overdue checklist: ${item.title}`)
    ].slice(0, 8);
    const recommendedActions = [
      ...(unreadMentions.length ? [`Resolve ${unreadMentions.length} unread mentions.`] : []),
      ...(blockedTasks.length ? [`Clear ${blockedTasks.length} blocked collaboration tasks.`] : []),
      ...(decisions.length === 0 ? ["Record at least one explicit decision for traceability."] : []),
      ...(resources.length === 0 ? ["Share reference resources for the room."] : []),
      ...(openHandoffs.length ? [`Resolve ${openHandoffs.length} open handoff notes.`] : []),
      ...(openChecklist.length ? [`Close ${openChecklist.length} checklist items before delivery.`] : [])
    ].slice(0, 6);
    return {
      room: room.toJSON(),
      metrics: {
        participantCount: participants.length,
        recentMessageCount: recentMessages.length,
        taskCompletionRate,
        checklistCompletionRate,
        openTaskCount: openTasks.length,
        blockedTaskCount: blockedTasks.length,
        unreadMentionCount: unreadMentions.length,
        acceptedDecisionCount: acceptedDecisions,
        resourceCount: resources.length,
        openHandoffCount: openHandoffs.length,
        healthScore
      },
      risks,
      recommendedActions
    };
  }

  auditTrail(user, filters = {}) {
    return this.audits
      .latest(parseLimit(filters.limit, 80, 200))
      .filter((record) => !filters.roomId || record.roomId === filters.roomId)
      .filter((record) => !filters.actorId || record.actorId === filters.actorId)
      .filter((record) => !filters.action || record.action === filters.action)
      .map((record) => record.toJSON());
  }

  async recordAudit(user, action, resourceType, resourceId, roomId, before = null, after = null, metadata = {}) {
    const now = new Date().toISOString();
    const record = new AuditRecord({
      id: this.database.nextId("audit"),
      actorId: user?.id || "system",
      action,
      resourceType,
      resourceId,
      roomId,
      summary: `${action} ${resourceType}`,
      before,
      after,
      metadata,
      occurredAt: now,
      createdAt: now,
      updatedAt: now
    });
    return this.audits.save(record);
  }
}
