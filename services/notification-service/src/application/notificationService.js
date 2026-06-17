import { ForbiddenError, NotFoundError, ValidationError } from "../../../../shared/http/errors.js";
import {
  DeliveryLog,
  Notification,
  NotificationPreference,
  NotificationSeverity,
  NotificationStatus
} from "../domain/notification.js";

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

function normalizeChannels(value, fallback = ["in_app"]) {
  const channels = Array.isArray(value) ? value.map((item) => String(item).trim()).filter(Boolean) : [];
  return channels.length ? [...new Set(channels)] : fallback;
}

function normalizeRecipients(input = {}) {
  if (Array.isArray(input.recipientIds)) {
    return [...new Set(input.recipientIds.map((item) => String(item).trim()).filter(Boolean))];
  }
  const single = String(input.recipientId || "").trim();
  return single ? [single] : [];
}

function renderTemplate(template, data = {}) {
  return String(template || "").replace(/\{([^}]+)\}/g, (_, key) => {
    const value = data[String(key).trim()];
    return value === undefined || value === null ? "" : String(value);
  });
}

function sortNotifications(items) {
  return [...items].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

export class NotificationService {
  constructor({ database, config, notifications, preferences, templates, deliveryLogs, digestService }) {
    this.database = database;
    this.config = config;
    this.notifications = notifications;
    this.preferences = preferences;
    this.templates = templates;
    this.deliveryLogs = deliveryLogs;
    this.digestService = digestService;
  }

  async createNotification(user, input) {
    const recipientId = input.recipientId ? String(input.recipientId) : user.id;
    if (!isTeacherRole(user.role) && recipientId !== user.id) {
      throw new ForbiddenError("cannot create notifications for another user");
    }
    const result = await this.emit({
      ...input,
      recipientId,
      actorId: user.id
    });
    return result.notifications[0];
  }

  async createBulk(user, input) {
    if (!isTeacherRole(user.role)) {
      throw new ForbiddenError("teacher role required");
    }
    return this.emit({
      ...input,
      actorId: user.id
    });
  }

  async emit(input) {
    const recipients = normalizeRecipients(input);
    if (!recipients.length) {
      throw new ValidationError("recipientId or recipientIds is required");
    }
    const template = input.templateCode ? this.templates.findByCode(input.templateCode) : null;
    if (input.templateCode && (!template || !template.enabled)) {
      throw new NotFoundError("notification template not found");
    }
    const payload = input.data && typeof input.data === "object" ? input.data : {};
    const title = input.title || renderTemplate(template?.titleTemplate, payload);
    const body = input.body || input.message || renderTemplate(template?.bodyTemplate, payload);
    const category = input.category || template?.defaultCategory || "general";
    const severity = input.severity || template?.defaultSeverity || NotificationSeverity.INFO;
    const baseChannels = normalizeChannels(input.channels, template?.defaultChannels || [this.config.defaultChannel]);
    const now = new Date().toISOString();
    const savedNotifications = [];
    const delivery = [];

    for (const recipientId of recipients) {
      const preference = await this.ensurePreference(recipientId);
      if (!preference.allowsCategory(category)) {
        continue;
      }
      const channels = preference.enabledChannels(baseChannels);
      if (!channels.length) {
        continue;
      }
      const notification = new Notification({
        id: this.database.nextId("notification"),
        recipientId,
        actorId: input.actorId || "system",
        type: input.type || input.templateCode || "system.notice",
        title: requireText(title, "title"),
        body: String(body || "").trim(),
        category,
        severity,
        channels,
        data: payload,
        status: NotificationStatus.ACTIVE,
        readAt: null,
        dismissedAt: null,
        expiresAt: input.expiresAt || null,
        createdAt: now,
        updatedAt: now
      });
      const saved = await this.notifications.save(notification);
      savedNotifications.push(saved);
      for (const channel of channels) {
        const log = new DeliveryLog({
          id: this.database.nextId("delivery"),
          notificationId: saved.id,
          recipientId,
          channel,
          status: channel === "in_app" ? "delivered" : "accepted",
          provider: "local",
          attemptCount: 1,
          error: null,
          deliveredAt: channel === "in_app" ? now : null,
          createdAt: now,
          updatedAt: now
        });
        delivery.push(await this.deliveryLogs.save(log));
      }
    }

    return {
      accepted: savedNotifications.length,
      skipped: recipients.length - savedNotifications.length,
      notifications: savedNotifications.map((item) => item.toJSON()),
      delivery: delivery.map((item) => item.toJSON())
    };
  }

  listNotifications(user, filters = {}) {
    const recipientId = isTeacherRole(user.role) && filters.recipientId ? filters.recipientId : user.id;
    const limit = Math.max(1, Math.min(this.config.maxPageSize, Number(filters.limit || 20)));
    const items = this.notifications.findByFilters({
      recipientId,
      category: filters.category,
      status: filters.status || NotificationStatus.ACTIVE,
      unreadOnly: filters.unreadOnly === "true" || filters.unreadOnly === true
    });
    return {
      recipientId,
      items: sortNotifications(items).slice(0, limit).map((item) => item.toJSON()),
      total: items.length,
      limit
    };
  }

  getSummary(user, filters = {}) {
    const recipientId = isTeacherRole(user.role) && filters.recipientId ? filters.recipientId : user.id;
    return this.digestService.buildUserSummary(recipientId);
  }

  getSystemSummary() {
    return this.digestService.buildSystemSummary();
  }

  async markRead(user, notificationId) {
    const notification = this.requireOwnedNotification(user, notificationId);
    notification.markRead();
    return this.notifications.save(notification);
  }

  async markAllRead(user, filters = {}) {
    const recipientId = isTeacherRole(user.role) && filters.recipientId ? filters.recipientId : user.id;
    const items = this.notifications.findByFilters({
      recipientId,
      status: NotificationStatus.ACTIVE,
      unreadOnly: true
    });
    const saved = [];
    for (const item of items) {
      item.markRead();
      saved.push(await this.notifications.save(item));
    }
    return {
      recipientId,
      updated: saved.length
    };
  }

  async dismiss(user, notificationId) {
    const notification = this.requireOwnedNotification(user, notificationId);
    notification.dismiss();
    return this.notifications.save(notification);
  }

  requireOwnedNotification(user, notificationId) {
    const notification = this.notifications.findById(notificationId);
    if (!notification) {
      throw new NotFoundError("notification not found");
    }
    if (!isTeacherRole(user.role) && notification.recipientId !== user.id) {
      throw new NotFoundError("notification not found");
    }
    return notification;
  }

  async ensurePreference(userId) {
    const existing = this.preferences.findByUser(userId);
    if (existing) {
      return existing;
    }
    const now = new Date().toISOString();
    const preference = new NotificationPreference({
      id: this.database.nextId("pref"),
      userId,
      channelSettings: { in_app: true, email: false, sms: false },
      categorySettings: {},
      quietHours: { enabled: false, start: "22:00", end: "07:00" },
      digestFrequency: "daily",
      createdAt: now,
      updatedAt: now
    });
    return this.preferences.save(preference);
  }

  async getPreference(user) {
    return this.ensurePreference(user.id);
  }

  async updatePreference(user, input = {}) {
    const preference = await this.ensurePreference(user.id);
    if (input.channelSettings && typeof input.channelSettings === "object") {
      preference.channelSettings = {
        ...preference.channelSettings,
        ...input.channelSettings
      };
    }
    if (input.categorySettings && typeof input.categorySettings === "object") {
      preference.categorySettings = {
        ...preference.categorySettings,
        ...input.categorySettings
      };
    }
    if (input.quietHours && typeof input.quietHours === "object") {
      preference.quietHours = {
        ...preference.quietHours,
        ...input.quietHours
      };
    }
    if (input.digestFrequency) {
      preference.digestFrequency = String(input.digestFrequency);
    }
    preference.touch();
    return this.preferences.save(preference);
  }
}
