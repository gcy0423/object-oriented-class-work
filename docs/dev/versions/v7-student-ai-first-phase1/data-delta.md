# v7 第一阶段数据变化

## 数据所有权

v7 第一阶段不新增后端数据所有权。后端已有数据仍由原服务负责。

| 数据 | 所有者 | v7 使用方式 |
| --- | --- | --- |
| 用户、角色 | identity-service | 学生登录、当前用户 |
| 课程、目标、任务、笔记 | learning-service | 学习页、AI 上下文、笔记创建 |
| 作业、提交、评分、反馈 | assessment-service | 作业页、详情页、提交页、反馈页 |
| 题库、题目、练习、错题 | assessment-service | 练习与错题页 |
| 统计摘要 | analytics-service / Gateway dashboard | AI 学习台、AI 分析结果 |
| AI ask/plan/summarize 记录 | ai-service | AI 面板、计划、笔记整理 |

## 前端新增派生状态

本阶段新增的 student 状态不持久化到后端。

```js
{
  student: {
    routeStack: [],
    ai: {
      dailyPlan: null,
      weaknessInsight: null,
      assignmentGuide: null,
      submissionCheck: null,
      noteOrganizeResult: null,
      lastCommand: null
    },
    learning: {
      selectedCourseId: "",
      selectedTaskId: "",
      taskDrafts: []
    },
    assignments: {
      mode: "course",
      selectedAssignmentId: "",
      selectedSubmissionId: "",
      submitDraft: {
        assignmentId: "",
        content: "",
        attachmentsText: ""
      },
      lastSubmission: null
    },
    practice: {
      selectedBankId: "",
      selectedSessionId: "",
      focusedQuestionIndex: 0,
      result: null
    },
    notes: {
      selectedCourseId: "",
      selectedNoteId: "",
      editorDraft: {
        title: "",
        content: "",
        tags: ""
      }
    }
  }
}
```

## Student Assignment ViewModel

作业页从 `GET /api/assignments` 派生三种视图：

```js
{
  mode: "course",
  byCourse: [
    {
      courseId: "course_ood",
      courseTitle: "面向对象技术与方法",
      assignments: []
    }
  ],
  calendarDays: [
    {
      date: "2026-06-21",
      assignments: []
    }
  ],
  deadlineList: [
    {
      id: "assignment_001",
      title: "领域模型设计作业",
      dueAt: "2026-06-21T23:59:59.000Z",
      urgency: "high",
      status: "published"
    }
  ]
}
```

## Student Submission Draft

提交草稿本阶段只保存在前端状态。

```js
{
  assignmentId: "assignment_001",
  content: "我的领域模型说明...",
  attachmentsText: "class-diagram.png: /uploads/class-diagram.png",
  updatedAt: "2026-06-18T12:00:00.000Z",
  aiCheck: null
}
```

提交到后端时转换为已有 submission DTO：

```js
{
  "content": "我的领域模型说明...",
  "attachments": [
    { "name": "class-diagram.png", "url": "/uploads/class-diagram.png" }
  ]
}
```

## Student AI Result DTO

所有 AI 结果都必须使用结构化对象，便于 UI 渲染。

```js
{
  id: "local_ai_result_001",
  type: "daily_plan",
  provider: "fallback",
  createdAt: "2026-06-18T12:00:00.000Z",
  summary: "",
  actions: [],
  risks: [],
  evidence: [],
  rawText: ""
}
```

`rawText` 只用于调试或降级展示，不作为主要 UI 数据源。

## 迁移规则

- 不迁移现有 JSON 数据。
- 新增前端状态必须有默认值，旧用户打开页面不能报错。
- 旧 dashboard 路由保留，新学生端路由为增量。
- 如果后续阶段新增真实后端 AI API，必须保持 StudentAiAdapter 的方法签名兼容。

