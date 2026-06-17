# API 契约文档

本文档定义当前接口和目标微服务接口。路径以 Gateway 对外暴露的 `/api/*` 为准；服务内部接口使用 `/internal/*`。

## 通用约定

浏览器 Base URL：

```text
http://127.0.0.1:4077
```

前端请求头：

```http
Authorization: Bearer <token>
Content-Type: application/json
```

Gateway 转发头：

```http
x-edumind-user-id: user_student
x-edumind-user-role: student
x-edumind-user-name: 林知夏
x-edumind-internal-key: edumind-local-internal-key
```

成功响应：

```json
{ "ok": true, "data": {} }
```

失败响应：

```json
{
  "ok": false,
  "code": "VALIDATION_ERROR",
  "message": "请求体不是合法 JSON。",
  "details": {}
}
```

列表接口优先使用分页：

```json
{
  "ok": true,
  "data": {
    "items": [],
    "page": 1,
    "pageSize": 20,
    "total": 0
  }
}
```

## Gateway

### `GET /api/health`

权限：公开。

目标响应：

```json
{
  "ok": true,
  "data": {
    "status": "up",
    "service": "gateway-service",
    "services": [
      { "name": "identity-service", "status": "up", "latencyMs": 5 }
    ],
    "time": "2026-06-16T00:00:00.000Z"
  }
}
```

### `GET /api/dashboard`

权限：登录用户。

目标：Gateway 聚合 learning、assessment、collaboration、analytics、ai provider 状态。

响应：

```json
{
  "ok": true,
  "data": {
    "courses": [],
    "goals": [],
    "tasks": [],
    "notes": [],
    "assignments": [],
    "practice": { "activeSessions": 0, "mistakeCount": 0 },
    "metrics": {
      "activeGoals": 1,
      "completionRate": 40,
      "studyMinutes": 120,
      "noteCount": 1,
      "assignmentCompletionRate": 0,
      "masteryScore": 0
    },
    "users": []
  },
  "meta": { "provider": "mock-local-llm" }
}
```

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

- `role` 只接受 `student`、`teacher`、`admin`。
- 非法角色默认为 `student`。
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
    }
  }
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
    "claims": { "sub": "user_student", "role": "student" }
  }
}
```

### `GET /internal/users/:id`

权限：内部服务。响应单个用户。

### `POST /internal/users/batch`

权限：内部服务。请求 `{ "ids": [] }`，响应 `{ "users": [] }`。

## learning-service

### `GET /api/courses`

权限：登录用户。

响应：`Course[]`。

### `POST /api/courses`

权限：`teacher`、`admin`。

请求：

```json
{
  "title": "面向对象技术与方法",
  "description": "课程说明",
  "tags": ["UML", "OOP"]
}
```

响应：`Course`。

### `GET /api/goals`

权限：登录用户。

查询参数：

- `ownerId`: 教师或管理员可指定。
- `courseId`: 按课程过滤。
- `status`: `active` 或 `completed`。

响应：`LearningGoal[]`。

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

规则：

- `courseId` 必须存在。
- `title` 必填。
- 创建者为 owner。

响应：`LearningGoal`。

### `POST /api/tasks`

权限：目标 owner、教师、管理员。

请求：

```json
{
  "goalId": "goal_demo",
  "title": "补充顺序图",
  "estimateMinutes": 60,
  "dueDate": "2026-06-21"
}
```

规则：创建后重算目标进度，发布 `task.created`。

响应：`StudyTask`。

### `PATCH /api/tasks/:id/complete`

权限：任务 owner、教师、管理员。

规则：任务状态改为 `done`，重算目标进度，发布 `task.completed`。

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

用途：ai-service 和 analytics-service 获取学习上下文。

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

## assessment-service

### `GET /api/assignments`

权限：登录用户。

查询参数：`courseId`、`classroomId`、`status`。

响应：分页 `Assignment[]`。

### `POST /api/assignments`

权限：`teacher`、`admin`。

请求：

```json
{
  "courseId": "course_ood",
  "classroomId": "class_ood_01",
  "title": "领域模型设计作业",
  "description": "提交用例图、类图和简要说明。",
  "dueAt": "2026-06-21T23:59:59.000Z",
  "rubricId": "rubric_ood_modeling"
}
```

响应：`Assignment`。

### `GET /api/assignments/:id`

权限：班级成员、教师、管理员。

响应：

```json
{
  "ok": true,
  "data": {
    "assignment": {},
    "rubric": {},
    "submissionSummary": {}
  }
}
```

### `POST /api/assignments/:id/submissions`

权限：学生、教师、管理员。

请求：

```json
{
  "content": "我的领域模型说明...",
  "attachments": [
    { "name": "class-diagram.png", "url": "/uploads/class-diagram.png" }
  ]
}
```

响应：`Submission`。

### `POST /api/submissions/:id/grade`

权限：`teacher`、`admin`。

请求：

```json
{
  "score": 92,
  "feedback": "类职责划分清晰，可以补充聚合关系说明。",
  "criteriaScores": [
    { "criterionId": "criterion_model_integrity", "score": 35, "comment": "模型完整。" }
  ]
}
```

响应：`Grade`。

### `POST /api/submissions/:id/ai-review`

权限：`teacher`、`admin`。

规则：assessment-service 校验 submission，调用 ai-service 内部批改接口，保存 AI feedback。

### 题库和练习接口

- `POST /api/question-banks`
- `GET /api/question-banks`
- `POST /api/questions`
- `GET /api/questions`
- `POST /api/practice-sessions`
- `GET /api/practice-sessions/:id`
- `POST /api/practice-sessions/:id/answers`
- `POST /api/practice-sessions/:id/finish`
- `GET /api/mistakes`
- `PATCH /api/mistakes/:id/review`

题型：

- `single_choice`
- `multiple_choice`
- `true_false`
- `short_answer`

## ai-service

### `POST /api/ai/ask`

权限：登录用户。

请求：

```json
{ "question": "如何解释顺序图的对象协作？" }
```

响应：`AIResponse`。

### `POST /api/ai/plan`

权限：登录用户。

请求：

```json
{ "goalId": "goal_demo" }
```

规则：ai-service 通过 learning-service 查询 goal 和学习上下文，不直接创建任务。

### `POST /api/ai/summarize`

权限：登录用户。

请求：

```json
{ "noteId": "note_uml" }
```

响应：`AIResponse`。

### `POST /internal/ai/review-submission`

权限：内部服务。

请求：

```json
{
  "submission": {},
  "assignment": {},
  "rubric": {},
  "student": {}
}
```

响应：

```json
{
  "ok": true,
  "data": {
    "summary": "整体完成度较高。",
    "suggestedScore": 88,
    "criteriaFeedback": [],
    "provider": "mock-local-llm"
  }
}
```

### `POST /api/ai/generate-questions`

权限：`teacher`、`admin`。

请求：

```json
{
  "courseId": "course_ood",
  "topic": "设计模式",
  "count": 5,
  "types": ["single_choice", "short_answer"],
  "difficulty": "medium"
}
```

响应：`Question[]` 草稿。

## collaboration-service

### `GET /api/collaboration/messages?roomId=room_ood`

权限：登录用户。响应 `RoomMessage[]`。

### `POST /api/collaboration/messages`

权限：登录用户。

请求：

```json
{ "roomId": "room_ood", "content": "我已经完成类图初稿。" }
```

响应：`RoomMessage`。

### `GET /api/activity?limit=30`

权限：登录用户。响应 `ActivityLog[]`。

### `GET /api/events`

权限：登录用户。

响应类型：`text/event-stream`。

初始事件：

```text
event: ready
data: {"ok":true}
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
  "payload": { "taskId": "task_1234" }
}
```

## analytics-service

### `GET /api/analytics/learning-summary`

权限：登录用户。

查询参数：`userId`、`courseId`。

响应：

```json
{
  "ok": true,
  "data": {
    "studyMinutes": 120,
    "completionRate": 40,
    "activeGoals": 1,
    "noteCount": 1,
    "trend": []
  }
}
```

### `GET /api/analytics/classrooms/:id`

权限：班级教师、管理员。

响应班级人数、提交率、平均分、掌握度。

### `GET /api/analytics/mastery`

权限：登录用户。

查询参数：`courseId`、`userId`。

响应知识点掌握度列表。

## 当前接口迁移表

| 当前接口 | 目标服务 |
| --- | --- |
| `GET /api/health` | gateway-service |
| `POST /api/auth/login` | identity-service |
| `GET /api/me` | identity-service |
| `GET /api/dashboard` | gateway-service |
| `GET /api/courses` | learning-service |
| `POST /api/goals` | learning-service |
| `POST /api/tasks` | learning-service |
| `PATCH /api/tasks/:id/complete` | learning-service |
| `POST /api/notes` | learning-service |
| `POST /api/ai/ask` | ai-service |
| `POST /api/ai/plan` | ai-service |
| `POST /api/ai/summarize` | ai-service |
| `GET /api/collaboration/messages` | collaboration-service |
| `POST /api/collaboration/messages` | collaboration-service |
| `GET /api/activity` | collaboration-service |
| `GET /api/events` | collaboration-service |

## API 开发验收

- 文档先写请求体和响应体。
- 实现统一 `ok` 和错误格式。
- 明确权限要求。
- 写操作有输入校验。
- 跨服务调用失败时返回明确错误。
- 关键写操作发送事件。
- 至少一条成功路径测试。
- 至少一条失败或权限路径测试。

