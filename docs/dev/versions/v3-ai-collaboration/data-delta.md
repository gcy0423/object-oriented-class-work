# v3 数据变化

v3 新增 AI 与协作数据文件。旧单体继续使用 `data/app-data.json`，v2 数据文件继续归各自服务所有。

## 新增数据文件

```text
data/ai.json
data/collaboration.json
```

## ai.json

拥有服务：ai-service。

结构：

```json
{
  "promptTemplates": [],
  "aiRequests": [],
  "aiResponses": [],
  "providerHealth": []
}
```

### promptTemplates

```json
{
  "id": "ask",
  "title": "课程问答",
  "system": "你是一个严谨、友好的学习教练，请结合课程目标给出可执行建议。",
  "user": "用户问题：{{question}}\n当前课程：{{courses}}\n当前学习目标：{{goals}}",
  "createdAt": "2026-06-16",
  "updatedAt": "2026-06-16"
}
```

v3 至少内置：

- `ask`
- `plan`
- `summarize`

### aiRequests

```json
{
  "id": "aireq_1234",
  "actorId": "user_student",
  "type": "ask",
  "input": {
    "question": "如何解释顺序图的对象协作？"
  },
  "provider": "mock-local-llm",
  "createdAt": "2026-06-16T00:00:00.000Z",
  "updatedAt": "2026-06-16T00:00:00.000Z"
}
```

### aiResponses

```json
{
  "id": "aires_1234",
  "requestId": "aireq_1234",
  "answer": "建议先说明参与对象...",
  "suggestions": ["加入今日任务", "生成复习卡片", "保存到笔记"],
  "provider": "mock-local-llm",
  "raw": null,
  "createdAt": "2026-06-16T00:00:00.000Z",
  "updatedAt": "2026-06-16T00:00:00.000Z"
}
```

## knowledgeResources

手写的 `learningResourceCatalog.js` 不再作为扩大代码量的手段。v3 通过 ai-service 的知识库适配层复用其检索能力：

```text
services/ai-service/src/infrastructure/knowledge/resourceSearch.js
```

迁移原则：

- 可以先保持导出函数兼容，避免破坏现有 AI 问答逻辑。
- 不在 v3 引入生成资源文件。
- 后续若提升质量，应增加真实知识点结构，而不是继续模板堆量。

## collaboration.json

拥有服务：collaboration-service。

结构：

```json
{
  "rooms": [],
  "messages": [],
  "activityLogs": [],
  "events": []
}
```

### rooms

```json
{
  "id": "room_ood",
  "title": "面向对象课程协作区",
  "courseId": "course_ood",
  "createdAt": "2026-06-16",
  "updatedAt": "2026-06-16"
}
```

### messages

```json
{
  "id": "msg_welcome",
  "roomId": "room_ood",
  "authorId": "user_teacher",
  "content": "本周重点完成需求分析和领域模型草图。",
  "createdAt": "2026-06-16",
  "updatedAt": "2026-06-16"
}
```

### activityLogs

```json
{
  "id": "log_1234",
  "actorId": "user_student",
  "type": "task.completed",
  "summary": "完成任务：补充顺序图",
  "payload": {
    "taskId": "task_1234"
  },
  "createdAt": "2026-06-16T00:00:00.000Z",
  "updatedAt": "2026-06-16T00:00:00.000Z"
}
```

### events

```json
{
  "id": "evt_1234",
  "type": "task.completed",
  "source": "learning-service",
  "actorId": "user_student",
  "summary": "完成任务：补充顺序图",
  "payload": {
    "taskId": "task_1234"
  },
  "occurredAt": "2026-06-16T00:00:00.000Z",
  "createdAt": "2026-06-16T00:00:00.000Z",
  "updatedAt": "2026-06-16T00:00:00.000Z"
}
```

## Seed 来源

v3 seed 应复制旧单体相关语义：

- `messages` -> collaboration-service seed。
- `activityLogs` 初始为空。
- AI templates -> ai-service seed。
- Provider 配置来自环境变量，不写死到数据文件。

## 数据迁移策略

v3 不自动拆分用户已有 `data/app-data.json`。第一次启动微服务时，如果 `data/ai.json` 或 `data/collaboration.json` 不存在，则写入 seed。

测试必须使用临时 JSON 文件，不污染真实 `data/`。

