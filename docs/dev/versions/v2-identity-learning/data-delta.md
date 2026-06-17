# v2 数据变化

v2 首次拆分真实业务数据。旧单体继续使用 `data/app-data.json`，微服务模式使用独立文件。

## 新增数据文件

```text
data/identity.json
data/learning.json
```

## identity.json

拥有服务：identity-service。

结构：

```json
{
  "users": [
    {
      "id": "user_student",
      "name": "林知夏",
      "role": "student",
      "email": "student@edumind.local",
      "avatar": "夏",
      "createdAt": "2026-06-16",
      "updatedAt": "2026-06-16"
    }
  ],
  "sessions": []
}
```

规则：

- `email` 唯一并转小写。
- `role` 只允许 `student`、`teacher`、`admin`。
- `sessions` v2 可以为空，Token 仍无状态校验。

## learning.json

拥有服务：learning-service。

结构：

```json
{
  "courses": [],
  "goals": [],
  "tasks": [],
  "notes": []
}
```

### Course

```json
{
  "id": "course_ood",
  "title": "面向对象技术与方法",
  "teacherId": "user_teacher",
  "description": "围绕 UML、类设计、架构分层和设计模式完成项目化学习。",
  "tags": ["UML", "OOP", "Design Pattern"],
  "createdAt": "2026-06-16",
  "updatedAt": "2026-06-16"
}
```

### LearningGoal

```json
{
  "id": "goal_demo",
  "ownerId": "user_student",
  "courseId": "course_ood",
  "title": "完成结课设计文档和可运行系统",
  "targetDate": "2026-06-21",
  "priority": "high",
  "status": "active",
  "progress": 45,
  "createdAt": "2026-06-16",
  "updatedAt": "2026-06-16"
}
```

### StudyTask

```json
{
  "id": "task_model",
  "goalId": "goal_demo",
  "ownerId": "user_student",
  "title": "整理领域模型与用例图",
  "status": "done",
  "estimateMinutes": 120,
  "dueDate": "2026-05-30",
  "createdAt": "2026-06-16",
  "updatedAt": "2026-06-16"
}
```

### LearningNote

```json
{
  "id": "note_uml",
  "ownerId": "user_student",
  "courseId": "course_ood",
  "title": "UML 复习摘要",
  "content": "用例图强调参与者与系统边界。",
  "tags": ["UML", "复习"],
  "createdAt": "2026-06-16",
  "updatedAt": "2026-06-16"
}
```

## Seed 来源

v2 seed 应复制 `server/src/infrastructure/seed.js` 中相关数据的语义：

- `users` -> identity-service seed。
- `courses`、`goals`、`tasks`、`notes` -> learning-service seed。
- `messages`、`activityLogs` 暂不迁移。

## 数据迁移策略

v2 不自动读取和拆分用户已有 `data/app-data.json`。第一次启动微服务时，如果对应文件不存在，则写入 seed。

后续如需从旧数据迁移，可新增脚本：

```text
scripts/migrateV2Data.mjs
```

但该脚本不是 v2 必须项。

