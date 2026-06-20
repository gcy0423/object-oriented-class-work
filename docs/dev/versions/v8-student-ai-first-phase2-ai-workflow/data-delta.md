# v8 数据变化

## 数据所有权

v8 默认不新增必须持久化 collection。AI 工作流结果可以先作为响应返回，由前端 state 持有。

| 数据 | 所有者 | v8 处理 |
| --- | --- | --- |
| 学生上下文输入 | 前端聚合 / Gateway 转发 | 不持久化 |
| AI 工作流结果 | ai-service 生成 | 默认不持久化 |
| 任务草稿 | ai-service 生成，前端确认 | 默认不持久化 |
| 任务创建 | learning-service | 沿用 `POST /api/tasks` |
| 笔记保存 | learning-service | 沿用 `POST /api/notes` |

## 可选新增 collection

如果实现者希望记录 AI 结果，可新增：

```json
{
  "studentAiResults": [
    {
      "id": "student_ai_result_001",
      "userId": "user_student",
      "type": "daily_plan",
      "inputHash": "hash",
      "result": {},
      "provider": "mock-local-llm",
      "createdAt": "2026-06-18T12:00:00.000Z"
    }
  ]
}
```

本阶段不要求持久化，测试不能依赖该 collection。

## 标准结果字段

所有 `/api/student-ai/*` 响应都应包含：

```js
{
  type: "",
  summary: "",
  actions: [],
  risks: [],
  evidence: [],
  questions: [],
  provider: "",
  generatedAt: "",
  rawText: ""
}
```

不同 workflow 可追加字段：

| type | 追加字段 |
| --- | --- |
| `daily_plan` | 无 |
| `weakness_insight` | `weaknesses` |
| `task_draft` | `draft` |
| `assignment_guide` | `outline`, `checklist` |
| `submission_check` | `completionEstimate`, `issues`, `strengths`, `rewriteSuggestions` |
| `note_organize` | `cards`, `assignmentParagraphs` |

## 迁移规则

- 不迁移已有 JSON 数据。
- 如果新增 `studentAiResults`，必须能在缺失该字段时自动 seed 空数组。
- 前端必须兼容 v7 fallback schema。
- 后端输出新增字段必须向后兼容。

