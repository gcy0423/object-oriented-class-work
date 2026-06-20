# v9 API 变化

## Student AI Results

```text
GET /api/student-ai/results
GET /api/student-ai/results/:id
PATCH /api/student-ai/results/:id/actions/:actionId
GET /api/student-ai/timeline
```

### `GET /api/student-ai/results`

查询参数：

```text
type=
courseId=
assignmentId=
limit=
```

响应：

```json
{
  "ok": true,
  "data": {
    "items": [
      {
        "id": "student_ai_result_001",
        "type": "daily_plan",
        "result": {},
        "actions": [],
        "createdAt": "2026-06-18T12:00:00.000Z"
      }
    ]
  }
}
```

### `PATCH /api/student-ai/results/:id/actions/:actionId`

请求：

```json
{
  "status": "completed",
  "note": "已完成专项练习"
}
```

状态枚举：

- `open`
- `completed`
- `dismissed`
- `converted`

## Student Task Drafts

```text
GET /api/student-ai/task-drafts
POST /api/student-ai/task-drafts
PATCH /api/student-ai/task-drafts/:id
DELETE /api/student-ai/task-drafts/:id
POST /api/student-ai/task-drafts/:id/confirm
```

`POST /api/student-ai/task-drafts/:id/confirm` 确认后调用 learning-service 创建真实 task，并把草稿状态改为 `confirmed`。

## Assignment Submission Drafts

```text
GET /api/assignment-submission-drafts
POST /api/assignment-submission-drafts
PATCH /api/assignment-submission-drafts/:id
DELETE /api/assignment-submission-drafts/:id
POST /api/assignment-submission-drafts/:id/submit
```

草稿 DTO：

```json
{
  "id": "submission_draft_001",
  "assignmentId": "assignment_001",
  "studentId": "user_student",
  "content": "提交正文",
  "attachments": [],
  "aiCheckResultId": "student_ai_result_002",
  "status": "draft",
  "updatedAt": "2026-06-18T12:00:00.000Z"
}
```

## Upload API

```text
POST /api/uploads
GET /api/uploads/:id
DELETE /api/uploads/:id
```

本阶段可使用 multipart 或 JSON base64。若使用 JSON：

```json
{
  "filename": "diagram.png",
  "contentType": "image/png",
  "base64": "..."
}
```

响应：

```json
{
  "ok": true,
  "data": {
    "id": "upload_001",
    "name": "diagram.png",
    "url": "/api/uploads/upload_001",
    "contentType": "image/png",
    "size": 12345
  }
}
```

## Notes CRUD

```text
GET /api/notes
GET /api/notes/:id
PATCH /api/notes/:id
DELETE /api/notes/:id
GET /api/note-organize-results
POST /api/note-organize-results/:id/save-note
```

## Student Notifications and Reminders

复用：

- `GET /api/notifications`
- `PATCH /api/notifications/:id/read`
- `GET /api/scheduler/reminders`
- `POST /api/scheduler/reminders`

新增便捷接口可选：

```text
GET /api/student/timeline
```

如果不新增，则 `GET /api/student-ai/timeline` 聚合 AI、任务、提交、练习、笔记、通知事件。

