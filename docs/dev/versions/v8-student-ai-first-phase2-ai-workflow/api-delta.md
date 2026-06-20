# v8 API 变化

v8 新增学生端 AI-first 后端接口。路径以 Gateway 对外暴露的 `/api/student-ai/*` 为准，具体实现先放在 `ai-service`。

## 通用约定

请求头继续使用：

```http
Authorization: Bearer <token>
Content-Type: application/json
```

成功响应：

```json
{
  "ok": true,
  "data": {
    "type": "daily_plan",
    "provider": "mock-local-llm",
    "generatedAt": "2026-06-18T12:00:00.000Z"
  }
}
```

失败时使用现有错误格式。

## `POST /api/student-ai/daily-plan`

用途：AI 学习台今日建议和行动卡片。

请求：

```json
{
  "dashboard": {},
  "assignments": [],
  "mistakes": [],
  "practiceHistory": [],
  "notes": [],
  "focus": "today"
}
```

响应：

```json
{
  "type": "daily_plan",
  "summary": "今天优先完成领域模型作业，并复习 UML 类图关系。",
  "actions": [
    {
      "type": "open_assignment",
      "label": "查看领域模型作业",
      "targetId": "assignment_001",
      "route": "student-assignment-detail",
      "priority": "high",
      "reason": "距离截止时间不足 2 天。"
    }
  ],
  "risks": [
    {
      "level": "medium",
      "title": "类图关系概念不稳定",
      "evidence": "最近错题集中在聚合、组合和依赖。"
    }
  ],
  "questions": [
    { "text": "是否要先生成一组 UML 类图专项练习？" }
  ],
  "provider": "mock-local-llm",
  "generatedAt": "2026-06-18T12:00:00.000Z",
  "rawText": ""
}
```

## `POST /api/student-ai/weakness-insight`

用途：AI 分析结果页。

请求：

```json
{
  "mistakes": [],
  "practiceHistory": [],
  "assignments": [],
  "analytics": {},
  "courseId": "course_ood"
}
```

响应：

```json
{
  "type": "weakness_insight",
  "summary": "目前最需要补强的是 UML 类图关系。",
  "weaknesses": [
    {
      "concept": "UML 类图关系",
      "title": "UML 类图关系",
      "score": 62,
      "rank": 1,
      "evidence": ["错题 3 道", "作业反馈提到关系表达不清"],
      "action": "先完成 8 道同类题，再回看作业反馈。"
    }
  ],
  "actions": [
    {
      "type": "start_practice",
      "label": "练 8 道同类题",
      "route": "student-practice"
    }
  ],
  "provider": "mock-local-llm",
  "generatedAt": "2026-06-18T12:00:00.000Z"
}
```

## `POST /api/student-ai/task-drafts`

用途：学习页 AI 新建任务草稿。

请求：

```json
{
  "request": "帮我把领域模型作业拆成今天可完成的学习任务",
  "dashboard": {},
  "courseId": "course_ood",
  "goalId": "goal_demo"
}
```

响应：

```json
{
  "type": "task_draft",
  "summary": "已生成一个可确认的学习任务草稿。",
  "draft": {
    "title": "复习 UML 类图关系并补作业说明",
    "type": "作业推进",
    "courseId": "course_ood",
    "goalId": "goal_demo",
    "estimateMinutes": 45,
    "dueDate": "2026-06-21",
    "steps": ["回看关系定义", "检查作业类图", "补充说明"],
    "doneDefinition": ["能区分聚合、组合、依赖", "作业说明补齐关系选择理由"],
    "linkedAssignmentId": "assignment_001"
  },
  "provider": "mock-local-llm",
  "generatedAt": "2026-06-18T12:00:00.000Z"
}
```

## `POST /api/student-ai/assignment-guide`

用途：作业详情 AI 拆解和作业指导。

请求：

```json
{
  "assignment": {},
  "rubric": {},
  "submissions": [],
  "studentContext": {}
}
```

响应：

```json
{
  "type": "assignment_guide",
  "summary": "先补齐类职责，再说明类之间的关系选择。",
  "outline": ["确认交付物", "拆分评分点", "整理提交结构"],
  "checklist": [
    "是否包含类职责说明",
    "是否说明关系类型",
    "是否把图示与文字说明对应起来"
  ],
  "actions": [
    {
      "type": "open_submit",
      "label": "开始提交草稿",
      "route": "student-submit"
    }
  ],
  "risks": ["只上传图、不解释关系，会导致反馈集中在论证不足。"],
  "provider": "mock-local-llm",
  "generatedAt": "2026-06-18T12:00:00.000Z"
}
```

## `POST /api/student-ai/submission-check`

用途：提交前 AI 自检。

请求：

```json
{
  "assignment": {},
  "rubric": {},
  "draft": {
    "content": "提交正文",
    "attachments": []
  }
}
```

响应：

```json
{
  "type": "submission_check",
  "summary": "草稿结构基本完整，但关系说明仍偏弱。",
  "completionEstimate": 76,
  "issues": [
    {
      "level": "warning",
      "title": "缺少关系说明",
      "suggestion": "为每条类关系补充选择理由。"
    }
  ],
  "strengths": ["已包含主要类职责。"],
  "rewriteSuggestions": ["把类职责说明按模块分组。"],
  "provider": "mock-local-llm",
  "generatedAt": "2026-06-18T12:00:00.000Z"
}
```

## `POST /api/student-ai/note-organize`

用途：AI 笔记整理结果。

请求：

```json
{
  "courseId": "course_ood",
  "note": {
    "title": "UML 关系笔记",
    "content": "..."
  },
  "target": "summary_cards_assignment"
}
```

响应：

```json
{
  "type": "note_organize",
  "summary": "本笔记主要总结类图关系和职责分配。",
  "cards": [
    {
      "front": "组合关系的生命周期特点是什么？",
      "back": "整体销毁时部分也随之销毁。"
    }
  ],
  "assignmentParagraphs": [
    "在本次领域模型中，订单与订单项采用组合关系，因为订单项生命周期依赖订单。"
  ],
  "provider": "mock-local-llm",
  "generatedAt": "2026-06-18T12:00:00.000Z"
}
```

## ApiClient 新增方法

```js
studentAiDailyPlan(input) {}
studentAiWeaknessInsight(input) {}
studentAiTaskDraft(input) {}
studentAiAssignmentGuide(input) {}
studentAiSubmissionCheck(input) {}
studentAiNoteOrganize(input) {}
```

