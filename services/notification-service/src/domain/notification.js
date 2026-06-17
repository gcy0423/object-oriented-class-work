import { Repository } from "../../../../shared/data/repository.js";
import { Entity } from "../../../../shared/domain/entity.js";

export const NotificationStatus = Object.freeze({
  ACTIVE: "active",
  DISMISSED: "dismissed",
  ARCHIVED: "archived"
});

export const NotificationSeverity = Object.freeze({
  INFO: "info",
  SUCCESS: "success",
  WARNING: "warning",
  CRITICAL: "critical"
});

export class Notification extends Entity {
  constructor(record) {
    super(record);
    this.recipientId = record.recipientId;
    this.actorId = record.actorId || "system";
    this.type = record.type || "system.notice";
    this.title = record.title;
    this.body = record.body || "";
    this.category = record.category || "general";
    this.severity = record.severity || NotificationSeverity.INFO;
    this.channels = Array.isArray(record.channels) ? record.channels : ["in_app"];
    this.data = record.data && typeof record.data === "object" ? record.data : {};
    this.status = record.status || NotificationStatus.ACTIVE;
    this.readAt = record.readAt || null;
    this.dismissedAt = record.dismissedAt || null;
    this.expiresAt = record.expiresAt || null;
  }

  markRead(now = new Date().toISOString()) {
    if (!this.readAt) {
      this.readAt = now;
    }
    this.touch();
  }

  dismiss(now = new Date().toISOString()) {
    this.status = NotificationStatus.DISMISSED;
    this.dismissedAt = now;
    this.touch();
  }
}

export class NotificationPreference extends Entity {
  constructor(record) {
    super(record);
    this.userId = record.userId;
    this.channelSettings = record.channelSettings && typeof record.channelSettings === "object"
      ? record.channelSettings
      : { in_app: true, email: false, sms: false };
    this.categorySettings = record.categorySettings && typeof record.categorySettings === "object"
      ? record.categorySettings
      : {};
    this.quietHours = record.quietHours && typeof record.quietHours === "object"
      ? record.quietHours
      : { enabled: false, start: "22:00", end: "07:00" };
    this.digestFrequency = record.digestFrequency || "daily";
  }

  allowsCategory(category) {
    const value = this.categorySettings?.[category];
    return value !== false;
  }

  enabledChannels(channels) {
    return channels.filter((channel) => this.channelSettings?.[channel] !== false);
  }
}

export class NotificationTemplate extends Entity {
  constructor(record) {
    super(record);
    this.code = record.code;
    this.titleTemplate = record.titleTemplate || "";
    this.bodyTemplate = record.bodyTemplate || "";
    this.defaultCategory = record.defaultCategory || "general";
    this.defaultSeverity = record.defaultSeverity || NotificationSeverity.INFO;
    this.defaultChannels = Array.isArray(record.defaultChannels) ? record.defaultChannels : ["in_app"];
    this.enabled = record.enabled !== false;
  }
}

export class DeliveryLog extends Entity {
  constructor(record) {
    super(record);
    this.notificationId = record.notificationId;
    this.recipientId = record.recipientId;
    this.channel = record.channel || "in_app";
    this.status = record.status || "accepted";
    this.provider = record.provider || "local";
    this.attemptCount = Number(record.attemptCount || 1);
    this.error = record.error || null;
    this.deliveredAt = record.deliveredAt || null;
  }
}

class NotificationRepositoryBase extends Repository {
  constructor(database, collectionName, factory) {
    super(database, collectionName, factory);
  }
}

export class NotificationRepository extends NotificationRepositoryBase {
  constructor(database) {
    super(database, "notifications", (record) => new Notification(record));
  }

  findByRecipient(recipientId) {
    return this.where((item) => item.recipientId === recipientId);
  }

  findByFilters({ recipientId, category, status, unreadOnly } = {}) {
    return this.where((item) => {
      if (recipientId && item.recipientId !== recipientId) {
        return false;
      }
      if (category && item.category !== category) {
        return false;
      }
      if (status && item.status !== status) {
        return false;
      }
      if (unreadOnly && item.readAt) {
        return false;
      }
      return true;
    });
  }
}

export class NotificationPreferenceRepository extends NotificationRepositoryBase {
  constructor(database) {
    super(database, "preferences", (record) => new NotificationPreference(record));
  }

  findByUser(userId) {
    return this.where((item) => item.userId === userId)[0] || null;
  }
}

export class NotificationTemplateRepository extends NotificationRepositoryBase {
  constructor(database) {
    super(database, "templates", (record) => new NotificationTemplate(record));
  }

  findByCode(code) {
    return this.where((item) => item.code === code)[0] || null;
  }
}

export class DeliveryLogRepository extends NotificationRepositoryBase {
  constructor(database) {
    super(database, "deliveryLogs", (record) => new DeliveryLog(record));
  }

  findByNotification(notificationId) {
    return this.where((item) => item.notificationId === notificationId);
  }

  findByRecipient(recipientId) {
    return this.where((item) => item.recipientId === recipientId);
  }
}
