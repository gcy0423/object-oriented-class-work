# v4 API 变化

v4 新增 assessment-service API，并由 Gateway 对外代理。

## 作业

### `GET /api/assignments`

权限：登录用户。

查询参数：

- `courseId`
- `classroomId`
- `status`

响应：分页或数组 `Assignment`。v4 可先返回数组，后续再统一分页。

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

权限：登录用户。

响应：

```json
{
  "ok": true,
  "data": {
    "assignment": {},
    "rubric": {},
    "submissions": [],
    "submissionSummary": {}
  }
}
```

### `POST /api/assignments/:id/submissions`

权限：登录用户。

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

## 评分

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

处理：

1. assessment-service 校验 submission。
2. assessment-service 调用 ai-service `/internal/ai/review-submission`。
3. assessment-service 保存 AI feedback。
4. assessment-service 发布 `submission.ai-reviewed`。

响应：

```json
{
  "ok": true,
  "data": {
    "review": {},
    "provider": "mock-local-llm"
  }
}
```

## Rubric

### `POST /api/rubrics`

权限：`teacher`、`admin`。

请求：

```json
{
  "courseId": "course_ood",
  "title": "领域模型评分规则",
  "criteria": [
    { "title": "模型完整性", "maxScore": 40 },
    { "title": "职责划分", "maxScore": 30 },
    { "title": "文档表达", "maxScore": 30 }
  ]
}
```

响应：`Rubric`。

### `GET /api/rubrics`

权限：登录用户。

查询参数：`courseId`。

## 题库

### `POST /api/question-banks`

权限：`teacher`、`admin`。

请求：

```json
{
  "courseId": "course_ood",
  "title": "面向对象基础题库",
  "description": "覆盖 UML、类设计、设计模式。"
}
```

响应：`QuestionBank`。

### `GET /api/question-banks`

权限：登录用户。

查询参数：`courseId`。

### `POST /api/questions`

权限：`teacher`、`admin`。

请求：

```json
{
  "bankId": "qbank_ood",
  "courseId": "course_ood",
  "type": "single_choice",
  "stem": "类图中空心三角箭头通常表示什么关系？",
  "choices": [
    { "id": "A", "text": "继承" },
    { "id": "B", "text": "组合" }
  ],
  "answer": "A",
  "analysis": "空心三角箭头表示泛化/继承。",
  "concept": "UML 类图",
  "difficulty": "easy"
}
```

响应：`Question`。

### `GET /api/questions`

权限：登录用户。

查询参数：`bankId`、`courseId`、`type`、`concept`。

## 练习

### `POST /api/practice-sessions`

权限：登录用户。

请求：

```json
{
  "courseId": "course_ood",
  "bankId": "qbank_ood",
  "questionCount": 5
}
```

响应：`PracticeSession`，包含题目列表但不暴露标准答案。

### `GET /api/practice-sessions/:id`

权限：练习 owner、教师、管理员。

响应：练习详情。

### `POST /api/practice-sessions/:id/answers`

权限：练习 owner。

请求：

```json
{
  "questionId": "question_1234",
  "answer": "A"
}
```

响应：

```json
{
  "ok": true,
  "data": {
    "record": {},
    "correct": true,
    "explanation": "空心三角箭头表示泛化/继承。"
  }
}
```

### `POST /api/practice-sessions/:id/finish`

权限：练习 owner。

响应：练习成绩、正确率、错题数量。

## 错题本

### `GET /api/mistakes`

权限：登录用户。

查询参数：`courseId`、`status`。

### `PATCH /api/mistakes/:id/review`

权限：错题 owner。

请求：

```json
{
  "status": "reviewed",
  "note": "已复习类图继承关系。"
}
```

响应：`MistakeItem`。

## 内部接口

### `GET /internal/assessment/context/:userId`

权限：内部服务。

用途：v5 analytics 或后续 AI 使用。

响应：

```json
{
  "ok": true,
  "data": {
    "userId": "user_student",
    "assignments": [],
    "submissions": [],
    "practiceSessions": [],
    "mistakes": [],
    "mastery": []
  }
}
```

### `GET /internal/assessment/dashboard/:userId`

权限：内部服务。

用途：Gateway Dashboard 聚合。

