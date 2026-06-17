# v1 API 变化

v1 只新增健康检查相关接口，不迁移业务接口。

## 新增服务内健康检查

每个服务暴露：

```http
GET /health
```

响应：

```json
{
  "ok": true,
  "data": {
    "status": "up",
    "service": "identity-service",
    "time": "2026-06-16T00:00:00.000Z"
  }
}
```

## Gateway 聚合健康检查

```http
GET /api/health
```

响应：

```json
{
  "ok": true,
  "data": {
    "status": "up",
    "service": "gateway-service",
    "services": [
      { "name": "identity-service", "status": "up", "latencyMs": 5 },
      { "name": "learning-service", "status": "up", "latencyMs": 6 },
      { "name": "assessment-service", "status": "up", "latencyMs": 4 },
      { "name": "ai-service", "status": "up", "latencyMs": 8 },
      { "name": "collaboration-service", "status": "up", "latencyMs": 5 },
      { "name": "analytics-service", "status": "up", "latencyMs": 5 }
    ],
    "time": "2026-06-16T00:00:00.000Z"
  }
}
```

## 不变接口

v1 不改变以下现有业务接口：

- `/api/auth/login`
- `/api/me`
- `/api/dashboard`
- `/api/courses`
- `/api/goals`
- `/api/tasks`
- `/api/notes`
- `/api/ai/*`
- `/api/collaboration/*`
- `/api/activity`
- `/api/events`

这些接口仍由当前单体处理，或在 v1 中暂不经过 Gateway 新实现。

