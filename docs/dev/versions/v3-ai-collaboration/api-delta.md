# v3 API 变化

v3 新增 ai-service 和 collaboration-service 的真实业务接口，并让 Gateway 对外保持原 API 路径。

## ai-service

### `POST /api/ai/ask`

权限：登录用户。

请求：

```json
{
  "question": "如何解释顺序图的对象协作？"
}
```

处理：

1. Gateway 校验 Token 并注入用户上下文。
2. ai-service 调用 learning-service `/internal/learning/context/:userId`。
3. ai-service 查询本地知识库。
4. ai-service 调用 Mock 或 LM Studio Provider。
5. ai-service 写入 AI 调用记录。
6. ai-service 可向 collaboration-service 发送 `ai.ask.completed` 事件。

响应：

```json
{
  "ok": true,
  "data": {
    "answer": "建议先说明参与对象...",
    "suggestions": ["加入今日任务", "生成复习卡片", "保存到笔记"],
    "provider": "mock-local-llm",
    "raw": null,
    "generatedAt": "2026-06-16T00:00:00.000Z"
  }
}
```

### `POST /api/ai/plan`

权限：登录用户。

请求：

```json
{
  "goalId": "goal_demo"
}
```

处理：

- ai-service 通过 learning context 查找 goal。
- 只生成计划文本，不直接创建任务。

响应：`AIResponse`。

### `POST /api/ai/summarize`

权限：登录用户。

请求：

```json
{
  "noteId": "note_uml"
}
```

处理：

- ai-service 通过 learning context 查找 note。
- 只生成摘要，不修改 note。

响应：`AIResponse`。

### `GET /internal/ai/provider-health`

权限：内部服务。

响应：

```json
{
  "ok": true,
  "data": {
    "provider": "mock-local-llm",
    "model": "mock",
    "status": "up"
  }
}
```

## collaboration-service

### `GET /api/collaboration/messages?roomId=room_ood`

权限：登录用户。

响应：

```json
{
  "ok": true,
  "data": [
    {
      "id": "msg_welcome",
      "roomId": "room_ood",
      "authorId": "user_teacher",
      "content": "本周重点完成需求分析和领域模型草图。",
      "createdAt": "2026-06-16",
      "updatedAt": "2026-06-16"
    }
  ]
}
```

### `POST /api/collaboration/messages`

权限：登录用户。

请求：

```json
{
  "roomId": "room_ood",
  "content": "我已经完成类图初稿。"
}
```

处理：

- 保存消息。
- 记录 activity log。
- 广播 `message.created` SSE 事件。

响应：`RoomMessage`。

### `GET /api/activity?limit=30`

权限：登录用户。

响应：`ActivityLog[]`。

### `GET /api/events`

权限：登录用户。

响应类型：`text/event-stream`。

初始事件：

```text
event: ready
data: {"ok":true}
```

业务事件：

```text
event: task.completed
data: {"id":"evt_...","type":"task.completed","payload":{},"occurredAt":"..."}
```

### `POST /internal/events`

权限：内部服务。

请求：

```json
{
  "type": "task.completed",
  "source": "learning-service",
  "actorId": "user_student",
  "summary": "完成任务：补充顺序图",
  "payload": {
    "taskId": "task_1234"
  }
}
```

响应：

```json
{
  "ok": true,
  "data": {
    "event": {},
    "activity": {}
  }
}
```

## learning-service 新内部行为

以下 API 响应格式不变，但成功写入后需要发布事件：

| 接口 | 事件 |
| --- | --- |
| `POST /api/goals` | `goal.created` |
| `POST /api/tasks` | `task.created` |
| `PATCH /api/tasks/:id/complete` | `task.completed` |
| `POST /api/notes` | `note.created` |

## Gateway 对外兼容接口

Gateway v3 对外新增或恢复：

| 方法 | 路径 | Gateway 处理 |
| --- | --- | --- |
| POST | `/api/ai/ask` | 校验 Token，代理 ai-service |
| POST | `/api/ai/plan` | 校验 Token，代理 ai-service |
| POST | `/api/ai/summarize` | 校验 Token，代理 ai-service |
| GET | `/api/collaboration/messages` | 校验 Token，代理 collaboration-service |
| POST | `/api/collaboration/messages` | 校验 Token，代理 collaboration-service |
| GET | `/api/activity` | 校验 Token，代理 collaboration-service |
| GET | `/api/events` | 校验 Token，代理 collaboration-service SSE |

Gateway `/api/dashboard` 增强：

- 保留 v2 的 learning 数据和 users。
- 新增 `activity` 或兼容旧前端需要的近期活动字段。
- `meta.provider` 来自 ai-service `/internal/ai/provider-health`。

## v3 不实现的接口

以下接口保留到 v4 或 v5：

- `POST /api/ai/generate-questions`
- `POST /internal/ai/review-submission`
- `/api/assignments/*`
- `/api/questions/*`
- `/api/practice/*`
- `/api/analytics/*`

