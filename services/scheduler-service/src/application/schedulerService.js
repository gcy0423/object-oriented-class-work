import { ForbiddenError, NotFoundError, ValidationError } from "../../../../shared/http/errors.js";
import { ReminderFrequency, ReminderRule, ReminderStatus, ScheduleRun } from "../domain/schedule.js";

function isTeacherRole(role) {
  return role === "teacher" || role === "admin";
}

function requireText(value, label) {
  const text = String(value || "").trim();
  if (!text) {
    throw new ValidationError(`${label} is required`);
  }
  return text;
}

function parseDate(value, label) {
  const time = Date.parse(value || "");
  if (!Number.isFinite(time)) {
    throw new ValidationError(`${label} must be a valid date`);
  }
  return new Date(time).toISOString();
}

function normalizeChannels(value) {
  const channels = Array.isArray(value) ? value.map((item) => String(item).trim()).filter(Boolean) : [];
  return channels.length ? [...new Set(channels)] : ["in_app"];
}

function normalizeFrequency(value) {
  if (Object.values(ReminderFrequency).includes(value)) {
    return value;
  }
  return ReminderFrequency.ONCE;
}

function addDays(dateIso, days) {
  const date = new Date(Date.parse(dateIso));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}

function computeNextRun(rule, fromIso) {
  if (rule.frequency === ReminderFrequency.ONCE) {
    return null;
  }
  if (rule.frequency === ReminderFrequency.DAILY) {
    return addDays(fromIso, 1);
  }
  if (rule.frequency === ReminderFrequency.WEEKLY) {
    return addDays(fromIso, 7);
  }
  return addDays(fromIso, Math.max(1, Number(rule.intervalDays || 1)));
}

function sortByNextRun(items) {
  return [...items].sort((a, b) => String(a.nextRunAt || a.dueAt).localeCompare(String(b.nextRunAt || b.dueAt)));
}

export class SchedulerService {
  constructor({ database, config, reminderRules, scheduleRuns, notificationClient, analyticsService, logger = console }) {
    this.database = database;
    this.config = config;
    this.reminderRules = reminderRules;
    this.scheduleRuns = scheduleRuns;
    this.notificationClient = notificationClient;
    this.analyticsService = analyticsService;
    this.logger = logger;
  }

  async createReminder(user, input = {}) {
    const ownerId = isTeacherRole(user.role) && input.ownerId ? String(input.ownerId) : user.id;
    const dueAt = parseDate(input.dueAt, "dueAt");
    const now = new Date().toISOString();
    const reminder = new ReminderRule({
      id: this.database.nextId("reminder"),
      ownerId,
      createdBy: user.id,
      courseId: input.courseId ? String(input.courseId) : null,
      title: requireText(input.title, "title"),
      message: String(input.message || "").trim(),
      targetType: input.targetType || "general",
      targetId: input.targetId || null,
      dueAt,
      nextRunAt: dueAt,
      lastRunAt: null,
      frequency: normalizeFrequency(input.frequency),
      intervalDays: Math.max(1, Number(input.intervalDays || 1)),
      status: input.status || ReminderStatus.ACTIVE,
      severity: input.severity || "info",
      channels: normalizeChannels(input.channels),
      metadata: input.metadata && typeof input.metadata === "object" ? input.metadata : {},
      createdAt: now,
      updatedAt: now
    });
    return this.reminderRules.save(reminder);
  }

  listReminders(user, filters = {}) {
    const query = isTeacherRole(user.role)
      ? {
          ownerId: filters.ownerId,
          courseId: filters.courseId,
          status: filters.status,
          targetType: filters.targetType
        }
      : {
          ownerId: user.id,
          courseId: filters.courseId,
          status: filters.status,
          targetType: filters.targetType
        };
    return {
      items: sortByNextRun(this.reminderRules.findByFilters(query)).map((item) => item.toJSON())
    };
  }

  async updateReminder(user, reminderId, input = {}) {
    const reminder = this.requireVisibleReminder(user, reminderId);
    if (!isTeacherRole(user.role) && reminder.ownerId !== user.id) {
      throw new ForbiddenError("cannot update another user's reminder");
    }
    if (input.title !== undefined) {
      reminder.title = requireText(input.title, "title");
    }
    if (input.message !== undefined) {
      reminder.message = String(input.message || "").trim();
    }
    if (input.dueAt !== undefined) {
      reminder.dueAt = parseDate(input.dueAt, "dueAt");
      reminder.nextRunAt = reminder.dueAt;
    }
    if (input.courseId !== undefined) {
      reminder.courseId = input.courseId ? String(input.courseId) : null;
    }
    if (input.frequency !== undefined) {
      reminder.frequency = normalizeFrequency(input.frequency);
    }
    if (input.intervalDays !== undefined) {
      reminder.intervalDays = Math.max(1, Number(input.intervalDays || 1));
    }
    if (input.status !== undefined) {
      if (!Object.values(ReminderStatus).includes(input.status)) {
        throw new ValidationError("invalid reminder status");
      }
      reminder.status = input.status;
    }
    if (input.channels !== undefined) {
      reminder.channels = normalizeChannels(input.channels);
    }
    if (input.metadata && typeof input.metadata === "object") {
      reminder.metadata = {
        ...reminder.metadata,
        ...input.metadata
      };
    }
    reminder.touch();
    return this.reminderRules.save(reminder);
  }

  requireVisibleReminder(user, reminderId) {
    const reminder = this.reminderRules.findById(reminderId);
    if (!reminder) {
      throw new NotFoundError("reminder not found");
    }
    if (!isTeacherRole(user.role) && reminder.ownerId !== user.id) {
      throw new NotFoundError("reminder not found");
    }
    return reminder;
  }

  previewDue(user, filters = {}) {
    const now = parseDate(filters.now || new Date().toISOString(), "now");
    const due = this.reminderRules.findDue(now)
      .filter((item) => isTeacherRole(user.role) || item.ownerId === user.id);
    return {
      now,
      count: due.length,
      items: sortByNextRun(due).map((item) => item.toJSON())
    };
  }

  async runDueJobs(input = {}) {
    const now = parseDate(input.now || new Date().toISOString(), "now");
    const limit = Math.max(1, Math.min(this.config.maxRunBatchSize, Number(input.limit || this.config.maxRunBatchSize)));
    const due = this.reminderRules.findDue(now).slice(0, limit);
    const results = [];
    for (const reminder of due) {
      results.push(await this.runReminder(reminder, { now, triggeredBy: input.triggeredBy || "scheduler" }));
    }
    return {
      now,
      attempted: due.length,
      results
    };
  }

  async runReminder(reminder, { now, triggeredBy }) {
    const run = new ScheduleRun({
      id: this.database.nextId("run"),
      reminderId: reminder.id,
      ownerId: reminder.ownerId,
      status: "running",
      startedAt: now,
      finishedAt: null,
      notificationIds: [],
      error: null,
      triggeredBy,
      createdAt: now,
      updatedAt: now
    });
    const savedRun = await this.scheduleRuns.save(run);
    try {
      const emitted = await this.notificationClient.emit({
        recipientId: reminder.ownerId,
        actorId: reminder.createdBy || "scheduler",
        templateCode: "scheduler.reminder",
        type: "scheduler.reminder",
        title: reminder.title,
        message: reminder.message || reminder.title,
        category: "scheduler",
        severity: reminder.severity,
        channels: reminder.channels,
        data: {
          reminderId: reminder.id,
          courseId: reminder.courseId,
          targetType: reminder.targetType,
          targetId: reminder.targetId,
          dueAt: reminder.dueAt
        }
      });
      savedRun.status = "success";
      savedRun.notificationIds = (emitted.notifications || []).map((item) => item.id);
      savedRun.finishedAt = new Date().toISOString();
      savedRun.touch();
      const nextRunAt = computeNextRun(reminder, now);
      reminder.lastRunAt = now;
      if (nextRunAt) {
        reminder.nextRunAt = nextRunAt;
      } else {
        reminder.nextRunAt = null;
        reminder.complete();
      }
      reminder.touch();
      await this.reminderRules.save(reminder);
      const finalRun = await this.scheduleRuns.save(savedRun);
      return {
        reminderId: reminder.id,
        status: "success",
        notificationIds: finalRun.notificationIds
      };
    } catch (error) {
      savedRun.status = "failed";
      savedRun.error = error.message;
      savedRun.finishedAt = new Date().toISOString();
      savedRun.touch();
      await this.scheduleRuns.save(savedRun);
      this.logger.warn?.(`scheduler reminder failed: ${error.message}`);
      return {
        reminderId: reminder.id,
        status: "failed",
        error: error.message
      };
    }
  }

  getDashboard(user, filters = {}) {
    return this.analyticsService.buildDashboard(user, filters, isTeacherRole(user.role));
  }

  getTimeline(user, filters = {}) {
    return {
      items: this.analyticsService.buildTimeline(user, filters, isTeacherRole(user.role))
    };
  }
}
