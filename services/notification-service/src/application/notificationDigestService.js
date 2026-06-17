import { NotificationStatus } from "../domain/notification.js";

function countBy(items, selector) {
  return items.reduce((acc, item) => {
    const key = selector(item);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function sortRecent(items) {
  return [...items].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

export class NotificationDigestService {
  constructor({ notifications, deliveryLogs }) {
    this.notifications = notifications;
    this.deliveryLogs = deliveryLogs;
  }

  buildUserSummary(userId) {
    const items = this.notifications.findByRecipient(userId);
    const active = items.filter((item) => item.status === NotificationStatus.ACTIVE);
    const unread = active.filter((item) => !item.readAt);
    return {
      userId,
      total: items.length,
      active: active.length,
      unread: unread.length,
      dismissed: items.filter((item) => item.status === NotificationStatus.DISMISSED).length,
      byCategory: countBy(active, (item) => item.category),
      bySeverity: countBy(active, (item) => item.severity),
      recent: sortRecent(active).slice(0, 10).map((item) => item.toJSON()),
      delivery: this.buildDeliveryHealth(userId)
    };
  }

  buildDeliveryHealth(userId) {
    const logs = this.deliveryLogs.findByRecipient(userId);
    const failed = logs.filter((item) => item.status === "failed");
    return {
      total: logs.length,
      accepted: logs.filter((item) => item.status === "accepted").length,
      delivered: logs.filter((item) => item.status === "delivered").length,
      failed: failed.length,
      failedChannels: countBy(failed, (item) => item.channel)
    };
  }

  buildSystemSummary() {
    const items = this.notifications.all();
    const logs = this.deliveryLogs.all();
    return {
      totalNotifications: items.length,
      activeNotifications: items.filter((item) => item.status === NotificationStatus.ACTIVE).length,
      unreadNotifications: items.filter((item) => !item.readAt && item.status === NotificationStatus.ACTIVE).length,
      byCategory: countBy(items, (item) => item.category),
      bySeverity: countBy(items, (item) => item.severity),
      delivery: {
        total: logs.length,
        byStatus: countBy(logs, (item) => item.status),
        byChannel: countBy(logs, (item) => item.channel)
      }
    };
  }
}
