# v6 数据变化

## 数据所有权

v6 默认不新增顶层数据文件。题库、题目、作业、提交、练习、错题仍归 assessment-service；用户归 identity-service；统计归 analytics-service 聚合输出。

| 数据 | 所有者 | v6 使用方式 |
| --- | --- | --- |
| 作业、提交、评分、AI 初评 | assessment-service | 作业管理页 |
| 题库、题目、答案解析 | assessment-service | 题库管理页 |
| 练习会话、答案、错题 | assessment-service | 练习页 |
| 课程、学生 | learning-service / identity-service | 筛选器、统计页 |
| analytics overview/teacher/course/student | analytics-service | 统计页 |
| health/provider | gateway/ai-service | 设置页 |

## 前端派生状态

v6 引入更多前端视图状态，但不持久化到后端。

```js
{
  filters: {
    assignments: {
      courseId: "",
      status: "",
      keyword: "",
      due: "all"
    },
    questionBanks: {
      courseId: "",
      type: "",
      difficulty: "",
      keyword: ""
    },
    practice: {
      courseId: "",
      bankId: "",
      status: "",
      mistakeStatus: "open"
    },
    analytics: {
      courseId: "",
      studentId: "",
      range: "all"
    }
  },
  draft: {
    assignment: null,
    questionBank: null,
    question: null,
    grade: null,
    profile: null
  },
  ui: {
    activePanel: "",
    modal: null,
    dirtyForms: {},
    expandedRows: {},
    focusedQuestionId: ""
  }
}
```

## Question DTO 规范

如果 v6 补齐题目 CRUD，前端以如下 DTO 作为表单和 API 的共同契约：

```js
{
  id: "question_strategy_001",
  bankId: "bank_design_pattern",
  courseId: "course_ood",
  type: "single_choice",
  stem: "策略模式主要解决什么问题？",
  choices: [
    { id: "A", text: "对象创建" },
    { id: "B", text: "算法族替换" }
  ],
  answer: ["B"],
  analysis: "策略模式将可替换算法封装为独立策略对象。",
  difficulty: "medium",
  concepts: ["策略模式", "多态"],
  status: "active",
  updatedAt: "2026-06-16T00:00:00.000Z"
}
```

题型枚举：

```js
export const QUESTION_TYPES = [
  { value: "single_choice", label: "单选题" },
  { value: "multiple_choice", label: "多选题" },
  { value: "short_answer", label: "简答题" },
  { value: "code_reading", label: "代码阅读题" }
];
```

## Assignment Draft DTO

```js
{
  id: "",
  title: "",
  description: "",
  courseId: "",
  dueAt: "",
  status: "draft",
  rubricId: "",
  publishMode: "now",
  visibility: "course",
  allowLateSubmission: false
}
```

## Analytics ViewModel

统计页可以从 v5 analytics DTO 派生出 ViewModel：

```js
{
  courseCards: [
    {
      id: "course_ood",
      title: "面向对象技术与方法",
      assignmentCompletionRate: 82,
      averageCorrectRate: 76,
      openMistakes: 6,
      mastery: [
        { label: "UML 类图", value: 85 },
        { label: "设计模式", value: 72 }
      ]
    }
  ],
  studentProfiles: [
    {
      id: "user_student",
      name: "林知夏",
      completionRate: 68,
      studyMinutes: 520,
      mistakeCount: 4,
      masteryScore: 76,
      riskReasons: []
    }
  ]
}
```

## 迁移规则

- v6 前端状态不需要迁移数据文件。
- 如果新增 assessment CRUD API，需要在 assessment-service seed 中补 2-3 条演示数据。
- 新增字段必须向后兼容：旧数据缺字段时前端使用默认值。
- 删除操作优先软删除，避免破坏已有练习历史。

