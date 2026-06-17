# v6 API 变化

v6 以复用 v4-v5 API 为主。如后端已具备对应接口，前端直接接入；如缺少编辑/删除能力，则本版本允许在 assessment-service 和 Gateway 中补齐最小 CRUD API。

## Assignment API

### 已有接口继续使用

- `GET /api/assignments`
- `POST /api/assignments`
- `GET /api/assignments/:id`
- `POST /api/assignments/:id/submissions`
- `POST /api/submissions/:id/grade`
- `POST /api/submissions/:id/ai-review`

### v6 可新增

#### `PATCH /api/assignments/:id`

权限：教师、管理员。

```json
{
  "title": "UML 类图作业修订版",
  "description": "补充聚合、组合和依赖关系说明。",
  "courseId": "course_ood",
  "dueAt": "2026-06-28",
  "status": "published",
  "rubricId": "rubric_uml"
}
```

#### `DELETE /api/assignments/:id`

权限：教师、管理员。

删除规则：如果已有提交，建议软删除或返回 `409 ASSIGNMENT_HAS_SUBMISSIONS`。

## Question Bank API

### 已有接口继续使用

- `GET /api/question-banks`
- `GET /api/questions`

### v6 可新增

#### `POST /api/question-banks`

```json
{
  "title": "设计模式题库",
  "description": "覆盖工厂、策略、观察者等模式。",
  "courseId": "course_ood",
  "tags": ["design-pattern", "uml"]
}
```

#### `PATCH /api/question-banks/:id`

```json
{
  "title": "设计模式综合题库",
  "description": "用于期末复习。",
  "tags": ["design-pattern", "review"]
}
```

#### `DELETE /api/question-banks/:id`

权限：教师、管理员。

删除规则：如果题库已有练习历史，建议软删除或返回 `409 QUESTION_BANK_IN_USE`。

## Question API

#### `POST /api/questions`

```json
{
  "bankId": "bank_design_pattern",
  "courseId": "course_ood",
  "type": "single_choice",
  "stem": "策略模式主要解决什么问题？",
  "choices": [
    { "id": "A", "text": "对象创建" },
    { "id": "B", "text": "算法族替换" },
    { "id": "C", "text": "对象持久化" }
  ],
  "answer": ["B"],
  "analysis": "策略模式将可替换算法封装为独立策略对象。",
  "difficulty": "medium",
  "concepts": ["策略模式", "多态"]
}
```

#### `PATCH /api/questions/:id`

同 `POST /api/questions`，字段可部分更新。

#### `DELETE /api/questions/:id`

权限：教师、管理员。

## Practice API

### 已有接口继续使用

- `POST /api/practice-sessions`
- `GET /api/practice-sessions/:id`
- `POST /api/practice-sessions/:id/answers`
- `POST /api/practice-sessions/:id/finish`
- `GET /api/mistakes`
- `PATCH /api/mistakes/:id/review`

### v6 可新增

#### `GET /api/practice-sessions`

权限：登录用户。学生读取自己的练习历史；教师/管理员可按学生或课程筛选。

查询参数：

```text
courseId=
bankId=
studentId=
status=
limit=
```

响应：

```json
{
  "ok": true,
  "data": {
    "items": [
      {
        "id": "practice_001",
        "studentId": "user_student",
        "bankId": "bank_uml",
        "courseId": "course_ood",
        "status": "finished",
        "totalCount": 10,
        "answeredCount": 10,
        "correctRate": 80,
        "startedAt": "2026-06-16T08:00:00.000Z",
        "finishedAt": "2026-06-16T08:20:00.000Z"
      }
    ]
  }
}
```

## Analytics API

v6 继续使用：

- `GET /api/analytics/overview`
- `GET /api/analytics/courses/:id`
- `GET /api/analytics/students/:id`
- `GET /api/analytics/teacher`

如统计页需要更多前端字段，优先在前端由 teacher analytics 现有字段派生；不要为纯 UI 排版新增后端字段。

## Settings API

### 健康面板

复用：

- `GET /api/health`
- `GET /api/me`

### 模型配置说明

设置页不保存密钥。模型配置从 `/api/health`、`/api/dashboard.meta.provider` 和静态说明组成。

前端 DTO：

```js
{
  provider: "mock-local-llm",
  mode: "mock",
  baseUrlHint: "LM_STUDIO_BASE_URL",
  modelHint: "LM_STUDIO_MODEL",
  testCommand: "npm run test:services",
  startCommand: "npm run start:services:mock"
}
```

## ApiClient 目标方法

```js
export class ApiClient {
  assignments(params = {}) {}
  assignmentDetail(id) {}
  createAssignment(input) {}
  updateAssignment(id, input) {}
  deleteAssignment(id) {}
  submitAssignment(id, input) {}
  gradeSubmission(id, input) {}
  reviewSubmissionWithAI(id) {}

  questionBanks(params = {}) {}
  createQuestionBank(input) {}
  updateQuestionBank(id, input) {}
  deleteQuestionBank(id) {}

  questions(params = {}) {}
  createQuestion(input) {}
  updateQuestion(id, input) {}
  deleteQuestion(id) {}

  practiceSessions(params = {}) {}
  startPractice(input) {}
  practiceSession(id) {}
  submitPracticeAnswer(id, input) {}
  finishPractice(id) {}
  mistakes(params = {}) {}
  reviewMistake(id, input) {}

  analyticsOverview() {}
  analyticsCourse(id) {}
  analyticsStudent(id) {}
  analyticsTeacher() {}

  health() {}
  me() {}
}
```

