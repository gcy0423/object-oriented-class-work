# v9 数据变化

## 新增 collection

### `studentAiResults`

```json
{
  "id": "student_ai_result_001",
  "userId": "user_student",
  "type": "daily_plan",
  "courseId": "course_ood",
  "assignmentId": null,
  "result": {},
  "provider": "mock-local-llm",
  "createdAt": "2026-06-18T12:00:00.000Z"
}
```

### `studentAiActions`

```json
{
  "id": "student_ai_action_001",
  "resultId": "student_ai_result_001",
  "userId": "user_student",
  "type": "open_assignment",
  "label": "查看领域模型作业",
  "route": "student-assignment-detail",
  "targetId": "assignment_001",
  "status": "open",
  "updatedAt": "2026-06-18T12:00:00.000Z"
}
```

### `studentTaskDrafts`

```json
{
  "id": "student_task_draft_001",
  "userId": "user_student",
  "sourceResultId": "student_ai_result_003",
  "draft": {},
  "status": "draft",
  "confirmedTaskId": null,
  "updatedAt": "2026-06-18T12:00:00.000Z"
}
```

### `submissionDrafts`

```json
{
  "id": "submission_draft_001",
  "assignmentId": "assignment_001",
  "studentId": "user_student",
  "content": "",
  "attachments": [],
  "aiCheckResultId": null,
  "status": "draft",
  "updatedAt": "2026-06-18T12:00:00.000Z"
}
```

### `uploads`

```json
{
  "id": "upload_001",
  "ownerId": "user_student",
  "filename": "diagram.png",
  "contentType": "image/png",
  "path": "data/uploads/upload_001.png",
  "size": 12345,
  "createdAt": "2026-06-18T12:00:00.000Z"
}
```

### `noteOrganizeResults`

```json
{
  "id": "note_organize_001",
  "userId": "user_student",
  "noteId": "note_001",
  "result": {},
  "savedNoteId": null,
  "createdAt": "2026-06-18T12:00:00.000Z"
}
```

## 迁移规则

- 缺失 collection 时 seed 空数组。
- 旧 notes 只有创建能力时，新增字段必须兼容旧数据。
- uploads 本地文件路径不得暴露绝对路径，只暴露 API URL。
- 删除笔记和草稿优先软删除，避免破坏时间线。

