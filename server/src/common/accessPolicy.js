import { ForbiddenError } from "./errors.js";
import { Roles } from "../domain/identity.js";

export const Permissions = Object.freeze({
  USE_AI: "ai:use",
  READ_DASHBOARD: "dashboard:read",
  MANAGE_COURSE: "course:manage",
  MANAGE_USERS: "user:manage",
  SEND_MESSAGE: "message:send",
  VIEW_AUDIT: "audit:view"
});

const rolePermissions = Object.freeze({
  [Roles.STUDENT]: Object.freeze([Permissions.USE_AI, Permissions.READ_DASHBOARD, Permissions.SEND_MESSAGE]),
  [Roles.TEACHER]: Object.freeze([Permissions.USE_AI, Permissions.READ_DASHBOARD, Permissions.MANAGE_COURSE, Permissions.SEND_MESSAGE, Permissions.VIEW_AUDIT]),
  [Roles.ADMIN]: Object.freeze(Object.values(Permissions))
});

export class AccessPolicyService {
  permissionsFor(user) {
    if (!user) {
      return [];
    }
    return rolePermissions[user.role] || [];
  }

  can(user, permission) {
    return this.permissionsFor(user).includes(permission);
  }

  assert(user, permission, message = "当前角色没有执行该操作的权限。") {
    if (!this.can(user, permission)) {
      throw new ForbiddenError(message, { role: user?.role || "anonymous", permission });
    }
  }

  assertOwnerOrElevated(user, ownerId, message = "只能访问自己的学习数据。") {
    if (user?.id === ownerId || [Roles.TEACHER, Roles.ADMIN].includes(user?.role)) {
      return;
    }
    throw new ForbiddenError(message, { ownerId, actorId: user?.id || "anonymous" });
  }
}
