# v2 API 变化

v2 新增 identity-service 和 learning-service 的真实业务接口，并让 Gateway 对外保持原 API 路径。

## identity-service

### `POST /api/auth/login`

权限：公开。

请求：

```json
{
  "email": "student@edumind.local",
  "name": "林知夏",
  "role": "student"
}
```

规则：

- `email` 转小写。
- `role` 只接受 `student`、`teacher`、`admin`。
- 非法 role 默认为 `student`。
- 邮箱不存在时创建演示用户。

响应：

```json
{
  "ok": true,
  "data": {
    "user": {
      "id": "user_student",
      "name": "林知夏",
      "role": "student",
      "email": "student@edumind.local",
      "avatar": "夏"
    },
    "token": "header.payload.signature"
  }
}
```

### `GET /api/me`

权限：登录用户。

Gateway 行为：

1. 读取 Bearer Token。
2. 调用 identity-service `POST /internal/auth/verify`。
3. 返回 user。

响应：

```json
{
  "ok": true,
  "data": { "user": {} }
}
```

### `POST /internal/auth/verify`

权限：内部服务。

请求：

```json
{ "token": "header.payload.signature" }
```

响应：

```json
{
  "ok": true,
  "data": {
    "user": {},
    "claims": {
      "sub": "user_student",
      "role": "student",
      "name": "林知夏"
    }
  }
}
```

### `GET /internal/users/:id`

权限：内部服务。

响应单个用户。

### `POST /internal/users/batch`

权限：内部服务。

请求：

```json
{ "ids": ["user_student", "user_teacher"] }
```

响应：

```json
{ "ok": true, "data": { "users": [] } }
```

### `GET /internal/users`

权限：内部服务。

用途：Gateway dashboard 聚合 v2 兼容旧响应中的 `users`。

响应：

```json
{ "ok": true, "data": { "users": [] } }
```

## learning-service

### `GET /api/courses`

权限：登录用户。

响应：`Course[]`。

### `GET /api/dashboard/learning`

权限：登录用户。

Gateway 注入用户上下文后调用。

响应：

```json
{
  "ok": true,
  "data": {
    "courses": [],
    "goals": [],
    "tasks": [],
    "notes": [],
    "metrics": {
      "activeGoals": 1,
      "completionRate": 33,
      "studyMinutes": 120,
      "noteCount": 1
    }
  }
}
```

### `POST /api/goals`

权限：登录用户。

请求：

```json
{
  "courseId": "course_ood",
  "title": "完成 UML 领域模型",
  "targetDate": "2026-06-21",
  "priority": "high"
}
```

响应：`LearningGoal`。

### `POST /api/tasks`

权限：登录用户，仅能操作自己的目标。

请求：

```json
{
  "goalId": "goal_demo",
  "title": "补充顺序图",
  "estimateMinutes": 60,
  "dueDate": "2026-06-21"
}
```

响应：`StudyTask`。

### `PATCH /api/tasks/:id/complete`

权限：登录用户，仅能操作自己的任务。

响应：`StudyTask`。

### `POST /api/notes`

权限：登录用户。

请求：

```json
{
  "courseId": "course_ood",
  "title": "UML 复习摘要",
  "content": "用例图强调参与者与系统边界。",
  "tags": ["UML", "复习"]
}
```

响应：`LearningNote`。

### `GET /internal/learning/context/:userId`

权限：内部服务。

用途：v3 ai-service 使用。

响应：

```json
{
  "ok": true,
  "data": {
    "userId": "user_student",
    "courses": [],
    "goals": [],
    "tasks": [],
    "notes": [],
    "metrics": {}
  }
}
```

## Gateway 对外兼容接口

Gateway v2 对外保留：

| 方法 | 路径 | Gateway 处理 |
| --- | --- | --- |
| POST | `/api/auth/login` | 代理 identity-service |
| GET | `/api/me` | 校验 Token 后返回 user |
| GET | `/api/dashboard` | 聚合 learning dashboard + users |
| GET | `/api/courses` | 校验 Token，代理 learning-service |
| POST | `/api/goals` | 校验 Token，代理 learning-service |
| POST | `/api/tasks` | 校验 Token，代理 learning-service |
| PATCH | `/api/tasks/:id/complete` | 校验 Token，代理 learning-service |
| POST | `/api/notes` | 校验 Token，代理 learning-service |

## v2 不改变的接口

以下接口仍由旧单体负责，或在微服务模式中暂不可用：

- `/api/ai/ask`
- `/api/ai/plan`
- `/api/ai/summarize`
- `/api/collaboration/messages`
- `/api/activity`
- `/api/events`

如果前端仍显示这些页面，v2 可以暂时让 Gateway 返回 `NOT_IMPLEMENTED`，但不能伪装成已迁移完成。

