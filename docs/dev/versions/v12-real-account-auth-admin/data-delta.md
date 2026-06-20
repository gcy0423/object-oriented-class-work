# Data Delta

## `users`

新增字段：

```json
{
  "passwordHash": "base64url-hash",
  "passwordSalt": "base64url-salt",
  "passwordUpdatedAt": "2026-06-21T00:00:00.000Z",
  "lastLoginAt": "2026-06-21T00:00:00.000Z",
  "createdBy": "user_admin"
}
```

规则：

- `passwordHash` 和 `passwordSalt` 只能在 identity-service 内部使用。
- 用户响应、dashboard 聚合、内部用户批量查询都不得返回密码字段。
- 历史用户如果缺少密码字段，迁移时写入开发默认密码的哈希。
- 默认开发账号建议：
  - `student@edumind.local` / `student123`
  - `teacher@edumind.local` / `teacher123`
  - `admin@edumind.local` / `admin123`

## `sessions`

从空数组升级为真实会话 collection：

```json
{
  "id": "session_001",
  "userId": "user_student",
  "tokenId": "token_001",
  "createdAt": "2026-06-21T00:00:00.000Z",
  "expiresAt": "2026-06-28T00:00:00.000Z",
  "lastSeenAt": "2026-06-21T00:10:00.000Z",
  "revokedAt": "",
  "revokedReason": ""
}
```

规则：

- `tokenId` 对应 token payload 的 `jti`。
- `revokedAt` 有值时 token 失效。
- `expiresAt` 过期时 token 失效。
- 登录成功写入 session。
- logout、禁用账号、重置密码时撤销相关 session。

## `rolePermissions`

保持现有 collection，允许管理员编辑：

```json
{
  "id": "perm_teacher_assessment",
  "role": "teacher",
  "resource": "assessment",
  "actions": ["create:assignment", "grade:submission", "read:course-report"],
  "description": "Teachers manage assessment workflows.",
  "createdAt": "2026-06-21",
  "updatedAt": "2026-06-21"
}
```

规则：

- 以 `role + resource` 作为逻辑唯一键。
- 更新权限矩阵时替换对应 role/resource 的 actions 和 description。
- 不允许删除最后一条 admin 平台管理权限。

## 迁移规则

- 启动 identity-service 时检测缺少密码字段的 seed/历史用户。
- 对缺密码的开发用户写入默认密码哈希。
- 不输出默认密码到接口响应。
- 历史 `sessions` 为空时无需额外迁移。
- 如果历史数据存在登录自动建出的管理员账号，保留账号但补齐密码哈希和状态字段。
