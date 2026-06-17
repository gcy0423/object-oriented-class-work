import { Repository } from "../../../../shared/data/repository.js";
import { Entity } from "../../../../shared/domain/entity.js";

export const ReminderStatus = Object.freeze({
  ACTIVE: "active",
  PAUSED: "paused",
  COMPLETED: "completed",
  CANCELLED: "cancelled"
});

export const ReminderFrequency = Object.freeze({
  ONCE: "once",
  DAILY: "daily",
  WEEKLY: "weekly",
  INTERVAL: "interval"
});

export class ReminderRule extends Entity {
  constructor(record) {
    super(record);
    this.ownerId = record.ownerId;
    this.createdBy = record.createdBy || record.ownerId;
    this.courseId = record.courseId || null;
    this.title = record.title;
    this.message = record.message || "";
    this.targetType = record.targetType || "general";
    this.targetId = record.targetId || null;
    this.dueAt = record.dueAt;
    this.nextRunAt = record.nextRunAt || record.dueAt;
    this.lastRunAt = record.lastRunAt || null;
    this.frequency = record.frequency || ReminderFrequency.ONCE;
    this.intervalDays = Number(record.intervalDays || 1);
    this.status = record.status || ReminderStatus.ACTIVE;
    this.severity = record.severity || "info";
    this.channels = Array.isArray(record.channels) ? record.channels : ["in_app"];
    this.metadata = record.metadata && typeof record.metadata === "object" ? record.metadata : {};
  }

  pause() {
    this.status = ReminderStatus.PAUSED;
    this.touch();
  }

  resume() {
    this.status = ReminderStatus.ACTIVE;
    this.touch();
  }

  complete() {
    this.status = ReminderStatus.COMPLETED;
    this.touch();
  }
}

export class ScheduleRun extends Entity {
  constructor(record) {
    super(record);
    this.reminderId = record.reminderId;
    this.ownerId = record.ownerId;
    this.status = record.status || "pending";
    this.startedAt = record.startedAt || this.createdAt;
    this.finishedAt = record.finishedAt || null;
    this.notificationIds = Array.isArray(record.notificationIds) ? record.notificationIds : [];
    this.error = record.error || null;
    this.triggeredBy = record.triggeredBy || "scheduler";
  }
}

class ScheduleRepositoryBase extends Repository {
  constructor(database, collectionName, factory) {
    super(database, collectionName, factory);
  }
}

export class ReminderRuleRepository extends ScheduleRepositoryBase {
  constructor(database) {
    super(database, "reminderRules", (record) => new ReminderRule(record));
  }

  findByOwner(ownerId) {
    return this.where((item) => item.ownerId === ownerId);
  }

  findByFilters({ ownerId, courseId, status, targetType } = {}) {
    return this.where((item) => {
      if (ownerId && item.ownerId !== ownerId) {
        return false;
      }
      if (courseId && item.courseId !== courseId) {
        return false;
      }
      if (status && item.status !== status) {
        return false;
      }
      if (targetType && item.targetType !== targetType) {
        return false;
      }
      return true;
    });
  }

  findDue(now) {
    const nowMs = Date.parse(now);
    return this.where((item) => {
      if (item.status !== ReminderStatus.ACTIVE) {
        return false;
      }
      const nextMs = Date.parse(item.nextRunAt || item.dueAt);
      return Number.isFinite(nextMs) && nextMs <= nowMs;
    });
  }
}

export class ScheduleRunRepository extends ScheduleRepositoryBase {
  constructor(database) {
    super(database, "scheduleRuns", (record) => new ScheduleRun(record));
  }

  findByReminder(reminderId) {
    return this.where((item) => item.reminderId === reminderId);
  }

  findByOwner(ownerId) {
    return this.where((item) => item.ownerId === ownerId);
  }
}
